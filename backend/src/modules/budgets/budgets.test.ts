import {
  addBudget,
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
let health: string;

beforeEach(async () => {
  await resetDb();
  alice = await registerUser();
  bob = await registerUser();
  food = await categoryId(alice, 'Food');
  health = await categoryId(alice, 'Health');
});
afterAll(disconnect);

describe('POST /api/budgets', () => {
  it('creates a budget with live-computed spent/remaining/percentUsed', async () => {
    await addExpense(alice, { categoryId: food, amount: 7500, expenseDate: '2026-09-10' });
    const res = await api()
      .post('/api/budgets')
      .set(alice.auth)
      .send({ categoryId: food, month: 9, year: 2026, limitAmount: 10000 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      categoryId: food,
      categoryName: 'Food',
      categoryColor: expect.any(String),
      categoryArchived: false,
      month: 9,
      year: 2026,
      limitAmount: 10000,
      spent: 7500,
      remaining: 2500,
      percentUsed: 75,
    });
  });

  it('rejects a duplicate (category, month, year) with 409 on the category field', async () => {
    await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 100 });
    const res = await api()
      .post('/api/budgets')
      .set(alice.auth)
      .send({ categoryId: food, month: 9, year: 2026, limitAmount: 500 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_BUDGET');
    expect(res.body.error.details[0].field).toBe('categoryId');
  });

  it('prevents duplicates under concurrent requests (double-click race)', async () => {
    const body = { categoryId: food, month: 9, year: 2026, limitAmount: 100 };
    const results = await Promise.all([1, 2, 3].map(() => api().post('/api/budgets').set(alice.auth).send(body)));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await prisma.budget.count({ where: { userId: alice.id } })).toBe(1);
  });

  it('allows the same category in a different month', async () => {
    await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 100 });
    const res = await api().post('/api/budgets').set(alice.auth).send({ categoryId: food, month: 10, year: 2026, limitAmount: 100 });
    expect(res.status).toBe(201);
  });

  it.each([
    [{ month: 13 }, 'month'],
    [{ month: 0 }, 'month'],
    [{ year: 1999 }, 'year'],
    [{ year: 2101 }, 'year'],
    [{ limitAmount: 0 }, 'limitAmount'],
    [{ limitAmount: -10 }, 'limitAmount'],
    [{ categoryId: 'x' }, 'categoryId'],
  ])('returns 400 for invalid input %#', async (override, field) => {
    const res = await api()
      .post('/api/budgets')
      .set(alice.auth)
      .send({ categoryId: food, month: 9, year: 2026, limitAmount: 100, ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it("returns 404 for another user's or a missing category", async () => {
    const bobsFood = await categoryId(bob, 'Food');
    for (const id of [bobsFood, NON_EXISTENT_ID]) {
      const res = await api().post('/api/budgets').set(alice.auth).send({ categoryId: id, month: 9, year: 2026, limitAmount: 1 });
      expect(res.status).toBe(404);
    }
  });

  it('returns 400 for an archived category', async () => {
    await api().delete(`/api/categories/${food}`).set(alice.auth);
    const res = await api().post('/api/budgets').set(alice.auth).send({ categoryId: food, month: 9, year: 2026, limitAmount: 1 });
    expect(res.status).toBe(400);
  });

  it('is backed by DB CHECK constraints (month range)', async () => {
    await expect(
      prisma.budget.create({ data: { userId: alice.id, categoryId: food, month: 13, year: 2026, limitAmount: 1 } }),
    ).rejects.toThrow();
  });
});

describe('GET /api/budgets', () => {
  it('counts only expenses inside the budget month (boundary days) for that category', async () => {
    await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 1000 });
    await addExpense(alice, { categoryId: food, amount: 10, expenseDate: '2026-08-31' }); // before
    await addExpense(alice, { categoryId: food, amount: 100, expenseDate: '2026-09-01' }); // first day
    await addExpense(alice, { categoryId: food, amount: 200, expenseDate: '2026-09-30' }); // last day
    await addExpense(alice, { categoryId: food, amount: 20, expenseDate: '2026-10-01' }); // after
    await addExpense(alice, { categoryId: health, amount: 999, expenseDate: '2026-09-15' }); // other category

    const res = await api().get('/api/budgets?month=9&year=2026').set(alice.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ spent: 300, remaining: 700, percentUsed: 30 });
  });

  it('handles the December → January rollover', async () => {
    await addBudget(alice, { categoryId: food, month: 12, year: 2026, limitAmount: 100 });
    await addExpense(alice, { categoryId: food, amount: 40, expenseDate: '2026-12-31' });
    await addExpense(alice, { categoryId: food, amount: 70, expenseDate: '2027-01-01' });
    const res = await api().get('/api/budgets?month=12&year=2026').set(alice.auth);
    expect(res.body[0].spent).toBe(40);
  });

  it('shows over-budget as negative remaining and >100% (expense is never blocked)', async () => {
    await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 8000 });
    await addExpense(alice, { categoryId: food, amount: 9200, expenseDate: '2026-09-21' });
    const [b] = (await api().get('/api/budgets?month=9&year=2026').set(alice.auth)).body;
    expect(b).toMatchObject({ spent: 9200, remaining: -1200, percentUsed: 115 });
  });

  it("filters by month/year/category and never returns another user's budgets", async () => {
    await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 1 });
    await addBudget(alice, { categoryId: health, month: 9, year: 2026, limitAmount: 1 });
    await addBudget(alice, { categoryId: food, month: 10, year: 2026, limitAmount: 1 });
    await addBudget(bob, { categoryId: await categoryId(bob, 'Food'), month: 9, year: 2026, limitAmount: 1 });

    expect((await api().get('/api/budgets').set(alice.auth)).body).toHaveLength(3);
    expect((await api().get('/api/budgets?month=9&year=2026').set(alice.auth)).body).toHaveLength(2);
    expect((await api().get(`/api/budgets?categoryId=${food}`).set(alice.auth)).body).toHaveLength(2);
    expect((await api().get('/api/budgets?month=13').set(alice.auth)).status).toBe(400);
  });

  it('keeps budgets of an archived category visible (historical correctness)', async () => {
    await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 1 });
    await api().delete(`/api/categories/${food}`).set(alice.auth);
    const [b] = (await api().get('/api/budgets?month=9&year=2026').set(alice.auth)).body;
    expect(b.categoryArchived).toBe(true);
  });
});

describe('GET/PATCH/DELETE /api/budgets/:id', () => {
  it('updates only the limit and recomputes', async () => {
    const { id } = await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 1000 });
    await addExpense(alice, { categoryId: food, amount: 500, expenseDate: '2026-09-02' });
    const res = await api().patch(`/api/budgets/${id}`).set(alice.auth).send({ limitAmount: 2000 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ limitAmount: 2000, spent: 500, remaining: 1500, percentUsed: 25 });
    expect((await api().get(`/api/budgets/${id}`).set(alice.auth)).body.limitAmount).toBe(2000);
  });

  it('rejects changing category/month/year (immutable)', async () => {
    const { id } = await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 1000 });
    expect((await api().patch(`/api/budgets/${id}`).set(alice.auth).send({ limitAmount: 5, month: 10 })).status).toBe(400);
    expect((await api().patch(`/api/budgets/${id}`).set(alice.auth).send({ limitAmount: 0 })).status).toBe(400);
  });

  it('deletes a budget without touching expenses', async () => {
    const { id } = await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 1000 });
    await addExpense(alice, { categoryId: food, amount: 500, expenseDate: '2026-09-02' });
    expect((await api().delete(`/api/budgets/${id}`).set(alice.auth)).status).toBe(204);
    expect((await api().get(`/api/budgets/${id}`).set(alice.auth)).status).toBe(404);
    expect(await prisma.expense.count({ where: { userId: alice.id } })).toBe(1);
  });

  it("returns 404 for another user's budget on every verb", async () => {
    const { id } = await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 1000 });
    expect((await api().get(`/api/budgets/${id}`).set(bob.auth)).status).toBe(404);
    expect((await api().patch(`/api/budgets/${id}`).set(bob.auth).send({ limitAmount: 1 })).status).toBe(404);
    expect((await api().delete(`/api/budgets/${id}`).set(bob.auth)).status).toBe(404);
    expect((await prisma.budget.findUnique({ where: { id } }))?.limitAmount.toNumber()).toBe(1000);
  });

  it('requires authentication', async () => {
    expect((await api().get('/api/budgets')).status).toBe(401);
  });
});
