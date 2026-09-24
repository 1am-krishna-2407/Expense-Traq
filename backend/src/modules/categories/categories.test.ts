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

beforeEach(async () => {
  await resetDb();
  alice = await registerUser();
  bob = await registerUser();
});
afterAll(disconnect);

describe('GET /api/categories', () => {
  it("lists only the caller's active categories", async () => {
    const res = await api().get('/api/categories').set(alice.auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(6);
    expect(res.body[0]).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      color: expect.stringMatching(/^#[0-9A-F]{6}$/),
      isArchived: false,
    });
    const aliceIds = new Set(res.body.map((c: { id: string }) => c.id));
    const bobs = await api().get('/api/categories').set(bob.auth);
    expect(bobs.body.some((c: { id: string }) => aliceIds.has(c.id))).toBe(false);
  });

  it('includes archived categories only when includeArchived=true', async () => {
    const id = await categoryId(alice, 'Other');
    await api().delete(`/api/categories/${id}`).set(alice.auth);
    expect((await api().get('/api/categories').set(alice.auth)).body).toHaveLength(5);
    const all = await api().get('/api/categories?includeArchived=true').set(alice.auth);
    expect(all.body).toHaveLength(6);
    expect(all.body.find((c: { id: string }) => c.id === id).isArchived).toBe(true);
  });

  it('requires authentication', async () => {
    expect((await api().get('/api/categories')).status).toBe(401);
  });
});

describe('POST /api/categories', () => {
  it('creates a category (colour normalised to upper case)', async () => {
    const res = await api().post('/api/categories').set(alice.auth).send({ name: ' Pets ', color: '#ab12cd' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), name: 'Pets', color: '#AB12CD', isArchived: false });
  });

  it('rejects a duplicate name case-insensitively with 409', async () => {
    const res = await api().post('/api/categories').set(alice.auth).send({ name: 'FOOD' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_CATEGORY');
  });

  it('allows the same name for different users', async () => {
    await api().post('/api/categories').set(alice.auth).send({ name: 'Pets' });
    const res = await api().post('/api/categories').set(bob.auth).send({ name: 'Pets' });
    expect(res.status).toBe(201);
  });

  it('enforces case-insensitive uniqueness at the database level too', async () => {
    await expect(
      prisma.category.create({ data: { userId: alice.id, name: 'fOoD' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it.each([
    [{ name: '' }, 'name'],
    [{ name: 'x'.repeat(51) }, 'name'],
    [{ name: 'Ok', color: 'red' }, 'color'],
    [{ name: 'Ok', color: '#12345' }, 'color'],
  ])('validates input %#', async (body, field) => {
    const res = await api().post('/api/categories').set(alice.auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe(field);
  });
});

describe('PATCH /api/categories/:id', () => {
  it('renames, recolours and unarchives', async () => {
    const id = await categoryId(alice, 'Other');
    await api().delete(`/api/categories/${id}`).set(alice.auth);
    const res = await api()
      .patch(`/api/categories/${id}`)
      .set(alice.auth)
      .send({ name: 'Misc', color: '#000000', isArchived: false });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, name: 'Misc', color: '#000000', isArchived: false });
  });

  it('allows changing only the case of its own name', async () => {
    const id = await categoryId(alice, 'Food');
    const res = await api().patch(`/api/categories/${id}`).set(alice.auth).send({ name: 'FOOD' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('FOOD');
  });

  it('returns 409 when renaming onto another category', async () => {
    const id = await categoryId(alice, 'Food');
    const res = await api().patch(`/api/categories/${id}`).set(alice.auth).send({ name: 'transport' });
    expect(res.status).toBe(409);
  });

  it("returns 404 for another user's category", async () => {
    const id = await categoryId(bob, 'Food');
    const res = await api().patch(`/api/categories/${id}`).set(alice.auth).send({ name: 'Hacked' });
    expect(res.status).toBe(404);
    expect((await prisma.category.findUnique({ where: { id } }))?.name).toBe('Food');
  });

  it('rejects an empty body and unknown fields', async () => {
    const id = await categoryId(alice, 'Food');
    expect((await api().patch(`/api/categories/${id}`).set(alice.auth).send({})).status).toBe(400);
    expect((await api().patch(`/api/categories/${id}`).set(alice.auth).send({ userId: bob.id })).status).toBe(400);
  });

  it('rejects a non-UUID id', async () => {
    expect((await api().patch('/api/categories/123').set(alice.auth).send({ name: 'x' })).status).toBe(400);
  });
});

describe('DELETE /api/categories/:id (archive)', () => {
  it('archives instead of deleting, so referencing expenses stay valid', async () => {
    const id = await categoryId(alice, 'Food');
    const expense = await addExpense(alice, { categoryId: id, amount: 100, expenseDate: '2026-03-01' });

    const res = await api().delete(`/api/categories/${id}`).set(alice.auth);
    expect(res.status).toBe(204);
    expect((await prisma.category.findUnique({ where: { id } }))?.isArchived).toBe(true);

    const exp = await api().get(`/api/expenses/${expense.id}`).set(alice.auth);
    expect(exp.status).toBe(200);
    expect(exp.body.category).toMatchObject({ id, name: 'Food', isArchived: true });
  });

  it("returns 404 for another user's or a missing category", async () => {
    const bobs = await categoryId(bob, 'Food');
    expect((await api().delete(`/api/categories/${bobs}`).set(alice.auth)).status).toBe(404);
    expect((await api().delete(`/api/categories/${NON_EXISTENT_ID}`).set(alice.auth)).status).toBe(404);
    expect((await prisma.category.findUnique({ where: { id: bobs } }))?.isArchived).toBe(false);
  });
});
