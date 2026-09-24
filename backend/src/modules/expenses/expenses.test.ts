import {
  addExpense,
  api,
  categoryId,
  disconnect,
  NON_EXISTENT_ID,
  registerUser,
  resetDb,
  type TestUser,
} from '../../../tests/helpers';
import { prisma } from '../../config/db';

let alice: TestUser;
let bob: TestUser;
let food: string;
let transport: string;

beforeEach(async () => {
  await resetDb();
  alice = await registerUser();
  bob = await registerUser();
  food = await categoryId(alice, 'Food');
  transport = await categoryId(alice, 'Transport');
});
afterAll(disconnect);

describe('POST /api/expenses', () => {
  it('creates an expense with the category embedded', async () => {
    const res = await api()
      .post('/api/expenses')
      .set(alice.auth)
      .send({ categoryId: food, amount: 850.5, description: '  Dinner  ', expenseDate: '2026-09-23' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      categoryId: food,
      category: { id: food, name: 'Food', color: expect.any(String), isArchived: false },
      amount: 850.5,
      description: 'Dinner',
      expenseDate: '2026-09-23',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('stores an empty description as null and accepts numeric strings', async () => {
    const res = await api()
      .post('/api/expenses')
      .set(alice.auth)
      .send({ categoryId: food, amount: '12.30', description: '   ', expenseDate: '2026-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.description).toBeNull();
    expect(res.body.amount).toBe(12.3);
  });

  it.each([
    [{ amount: -5 }, 'amount'],
    [{ amount: 0 }, 'amount'],
    [{ amount: 10.123 }, 'amount'],
    [{ amount: 'abc' }, 'amount'],
    [{ expenseDate: '2026-02-30' }, 'expenseDate'],
    [{ expenseDate: '23/09/2026' }, 'expenseDate'],
    [{ categoryId: 'not-a-uuid' }, 'categoryId'],
    [{ description: 'x'.repeat(256) }, 'description'],
  ])('returns 400 for invalid input %#', async (override, field) => {
    const body = { categoryId: food, amount: 100, expenseDate: '2026-09-01', ...override };
    const res = await api().post('/api/expenses').set(alice.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it('returns 404 for a non-existent category', async () => {
    const res = await api()
      .post('/api/expenses')
      .set(alice.auth)
      .send({ categoryId: NON_EXISTENT_ID, amount: 1, expenseDate: '2026-09-01' });
    expect(res.status).toBe(404);
  });

  it("returns 404 when using another user's category", async () => {
    const bobsFood = await categoryId(bob, 'Food');
    const res = await api()
      .post('/api/expenses')
      .set(alice.auth)
      .send({ categoryId: bobsFood, amount: 1, expenseDate: '2026-09-01' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for an archived category', async () => {
    await api().delete(`/api/categories/${food}`).set(alice.auth);
    const res = await api()
      .post('/api/expenses')
      .set(alice.auth)
      .send({ categoryId: food, amount: 1, expenseDate: '2026-09-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('categoryId');
  });

  it('is backed by a DB CHECK constraint on amount > 0', async () => {
    await expect(
      prisma.expense.create({
        data: { userId: alice.id, categoryId: food, amount: -1, expenseDate: new Date('2026-01-01') },
      }),
    ).rejects.toThrow();
  });
});

describe('GET/PATCH/DELETE /api/expenses/:id', () => {
  it('gets, updates and deletes own expense', async () => {
    const { id } = await addExpense(alice, { categoryId: food, amount: 100, expenseDate: '2026-09-01' });

    expect((await api().get(`/api/expenses/${id}`).set(alice.auth)).body.amount).toBe(100);

    const patched = await api()
      .patch(`/api/expenses/${id}`)
      .set(alice.auth)
      .send({ amount: 250, categoryId: transport, description: 'Cab', expenseDate: '2026-09-02' });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ amount: 250, categoryId: transport, description: 'Cab', expenseDate: '2026-09-02' });
    expect(patched.body.category.name).toBe('Transport');

    expect((await api().delete(`/api/expenses/${id}`).set(alice.auth)).status).toBe(204);
    expect((await api().get(`/api/expenses/${id}`).set(alice.auth)).status).toBe(404);
  });

  it('lets an expense in a now-archived category be edited without moving it', async () => {
    const { id } = await addExpense(alice, { categoryId: food, amount: 100, expenseDate: '2026-09-01' });
    await api().delete(`/api/categories/${food}`).set(alice.auth);
    const res = await api().patch(`/api/expenses/${id}`).set(alice.auth).send({ amount: 120 });
    expect(res.status).toBe(200);
    // …but moving another expense INTO the archived category is refused.
    const other = await addExpense(alice, { categoryId: transport, amount: 1, expenseDate: '2026-09-01' });
    const move = await api().patch(`/api/expenses/${other.id}`).set(alice.auth).send({ categoryId: food });
    expect(move.status).toBe(400);
  });

  it("returns 404 (not 403) for another user's expense on every verb", async () => {
    const { id } = await addExpense(alice, { categoryId: food, amount: 100, expenseDate: '2026-09-01' });
    expect((await api().get(`/api/expenses/${id}`).set(bob.auth)).status).toBe(404);
    expect((await api().patch(`/api/expenses/${id}`).set(bob.auth).send({ amount: 1 })).status).toBe(404);
    expect((await api().delete(`/api/expenses/${id}`).set(bob.auth)).status).toBe(404);
    const unchanged = await prisma.expense.findUnique({ where: { id } });
    expect(unchanged?.amount.toNumber()).toBe(100);
  });

  it("rejects moving an expense into another user's category", async () => {
    const { id } = await addExpense(alice, { categoryId: food, amount: 100, expenseDate: '2026-09-01' });
    const bobsFood = await categoryId(bob, 'Food');
    expect((await api().patch(`/api/expenses/${id}`).set(alice.auth).send({ categoryId: bobsFood })).status).toBe(404);
  });

  it('rejects an empty PATCH body and unknown fields', async () => {
    const { id } = await addExpense(alice, { categoryId: food, amount: 100, expenseDate: '2026-09-01' });
    expect((await api().patch(`/api/expenses/${id}`).set(alice.auth).send({})).status).toBe(400);
    expect((await api().patch(`/api/expenses/${id}`).set(alice.auth).send({ userId: bob.id })).status).toBe(400);
  });
});

describe('GET /api/expenses (filter / sort / paginate)', () => {
  beforeEach(async () => {
    const rows: [string, number, string, string][] = [
      [food, 100, '2026-08-31', 'Groceries'],
      [food, 250, '2026-09-01', 'Dinner out'],
      [transport, 500, '2026-09-10', 'Uber'],
      [food, 1200, '2026-09-15', 'Party dinner'],
      [transport, 60, '2026-09-30', 'Metro'],
      [transport, 900, '2026-10-01', 'Flight'],
    ];
    for (const [categoryId, amount, expenseDate, description] of rows) {
      await addExpense(alice, { categoryId, amount, expenseDate, description });
    }
    await addExpense(bob, { categoryId: await categoryId(bob, 'Food'), amount: 999, expenseDate: '2026-09-05' });
  });

  const list = (qs: string, user = alice) => api().get(`/api/expenses${qs}`).set(user.auth);
  const amounts = (body: { data: { amount: number }[] }) => body.data.map((e) => e.amount);

  it("returns only the caller's rows, newest first by default, with meta", async () => {
    const res = await list('');
    expect(res.status).toBe(200);
    expect(amounts(res.body)).toEqual([900, 60, 1200, 500, 250, 100]);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 6, totalPages: 1 });
  });

  it('filters by inclusive date range (month boundaries)', async () => {
    const res = await list('?startDate=2026-09-01&endDate=2026-09-30');
    expect(amounts(res.body).sort((a, b) => a - b)).toEqual([60, 250, 500, 1200]);
  });

  it('filters by category', async () => {
    const res = await list(`?categoryId=${transport}`);
    expect(res.body.meta.total).toBe(3);
    expect(res.body.data.every((e: { categoryId: string }) => e.categoryId === transport)).toBe(true);
  });

  it('filters by amount range', async () => {
    expect(amounts((await list('?minAmount=250&maxAmount=900&sortBy=amount&sortOrder=asc')).body)).toEqual([250, 500, 900]);
  });

  it('combines filters with AND', async () => {
    const res = await list(`?categoryId=${food}&startDate=2026-09-01&endDate=2026-09-30&minAmount=300`);
    expect(amounts(res.body)).toEqual([1200]);
  });

  it('searches descriptions case-insensitively', async () => {
    expect(amounts((await list('?search=DINNER&sortBy=amount')).body)).toEqual([1200, 250]);
  });

  it('sorts by amount ascending', async () => {
    expect(amounts((await list('?sortBy=amount&sortOrder=asc')).body)).toEqual([60, 100, 250, 500, 900, 1200]);
  });

  it('paginates with correct meta', async () => {
    const p1 = await list('?limit=4&page=1&sortBy=amount&sortOrder=asc');
    const p2 = await list('?limit=4&page=2&sortBy=amount&sortOrder=asc');
    expect(amounts(p1.body)).toEqual([60, 100, 250, 500]);
    expect(amounts(p2.body)).toEqual([900, 1200]);
    expect(p2.body.meta).toEqual({ page: 2, limit: 4, total: 6, totalPages: 2 });
  });

  it('returns an empty page (not an error) when nothing matches', async () => {
    const res = await list('?minAmount=100000');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
  });

  it.each([
    '?minAmount=500&maxAmount=100',
    '?startDate=2026-10-01&endDate=2026-09-01',
    '?limit=101',
    '?page=0',
    '?sortBy=description',
    '?startDate=2026-02-30',
    '?categoryId=nope',
  ])('returns 400 for invalid query %s', async (qs) => {
    const res = await list(qs);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
