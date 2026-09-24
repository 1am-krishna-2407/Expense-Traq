import {
  addBudget,
  addExpense,
  api,
  categoryId,
  disconnect,
  registerUser,
  resetDb,
  type TestUser,
} from '../../../tests/helpers';
import { currentPeriod } from '../../utils/dates';

let alice: TestUser;
let bob: TestUser;

beforeEach(async () => {
  await resetDb();
  alice = await registerUser();
  bob = await registerUser();
});
afterAll(disconnect);

const summary = (qs: string, user = alice) => api().get(`/api/dashboard/summary${qs}`).set(user.auth);

describe('GET /api/dashboard/summary', () => {
  it('matches manually computed totals on a seeded dataset', async () => {
    const food = await categoryId(alice, 'Food');
    const transport = await categoryId(alice, 'Transport');
    const health = await categoryId(alice, 'Health');

    await addBudget(alice, { categoryId: food, month: 9, year: 2026, limitAmount: 10000 });
    await addBudget(alice, { categoryId: transport, month: 9, year: 2026, limitAmount: 15000 });

    // Food: 3000 + 4500.25 = 7500.25 ; Transport: 12000 ; Health (unbudgeted): 2100
    await addExpense(alice, { categoryId: food, amount: 3000, expenseDate: '2026-09-01' });
    await addExpense(alice, { categoryId: food, amount: 4500.25, expenseDate: '2026-09-30' });
    await addExpense(alice, { categoryId: transport, amount: 12000, expenseDate: '2026-09-15' });
    await addExpense(alice, { categoryId: health, amount: 2100, expenseDate: '2026-09-20' });
    // Outside the month — must be ignored
    await addExpense(alice, { categoryId: food, amount: 999, expenseDate: '2026-08-31' });
    await addExpense(alice, { categoryId: food, amount: 999, expenseDate: '2026-10-01' });
    // Another user's data — must be ignored
    await addExpense(bob, { categoryId: await categoryId(bob, 'Food'), amount: 50000, expenseDate: '2026-09-10' });

    const res = await summary('?month=9&year=2026');
    expect(res.status).toBe(200);
    const d = res.body;
    expect(d.period).toEqual({ month: 9, year: 2026 });
    expect(d.totalExpenses).toBe(21600.25);
    expect(d.totalBudget).toBe(25000);
    expect(d.remainingBudget).toBe(3399.75);

    const byName = Object.fromEntries(d.categorySummary.map((c: { categoryName: string }) => [c.categoryName, c]));
    expect(byName.Food).toMatchObject({ spent: 7500.25, budget: 10000, remaining: 2499.75, percentUsed: 75, transactionCount: 2 });
    expect(byName.Transport).toMatchObject({ spent: 12000, budget: 15000, remaining: 3000, percentUsed: 80 });
    expect(byName.Health).toMatchObject({ spent: 2100, budget: null, remaining: null, percentUsed: null });
    // Active categories with no spend still appear (so the user sees every envelope).
    expect(byName.Utilities).toMatchObject({ spent: 0, budget: null });
    // Ordered by spend, highest first.
    expect(d.categorySummary[0].categoryName).toBe('Transport');
  });

  it('includes an archived category only when it has spend in the period', async () => {
    const food = await categoryId(alice, 'Food');
    const other = await categoryId(alice, 'Other');
    await addExpense(alice, { categoryId: food, amount: 100, expenseDate: '2026-09-02' });
    await api().delete(`/api/categories/${food}`).set(alice.auth);
    await api().delete(`/api/categories/${other}`).set(alice.auth);

    const d = (await summary('?month=9&year=2026')).body;
    const names = d.categorySummary.map((c: { categoryName: string }) => c.categoryName);
    expect(names).toContain('Food');
    expect(names).not.toContain('Other');
    expect(d.totalExpenses).toBe(100);
  });

  it('returns a 6-month zero-filled trend that crosses the year boundary', async () => {
    const food = await categoryId(alice, 'Food');
    await addExpense(alice, { categoryId: food, amount: 100, expenseDate: '2025-11-15' });
    await addExpense(alice, { categoryId: food, amount: 300, expenseDate: '2026-02-01' });
    await addExpense(alice, { categoryId: food, amount: 5, expenseDate: '2025-08-31' }); // too old

    const d = (await summary('?month=2&year=2026')).body;
    expect(d.monthlyTrend).toEqual([
      { month: 9, year: 2025, total: 0 },
      { month: 10, year: 2025, total: 0 },
      { month: 11, year: 2025, total: 100 },
      { month: 12, year: 2025, total: 0 },
      { month: 1, year: 2026, total: 0 },
      { month: 2, year: 2026, total: 300 },
    ]);
  });

  it('returns zeros for an empty month (empty state)', async () => {
    const d = (await summary('?month=1&year=2020')).body;
    expect(d.totalExpenses).toBe(0);
    expect(d.totalBudget).toBe(0);
    expect(d.remainingBudget).toBe(0);
    expect(d.categorySummary.every((c: { spent: number }) => c.spent === 0)).toBe(true);
  });

  it('defaults to the current month', async () => {
    expect((await summary('')).body.period).toEqual(currentPeriod());
  });

  it('validates month/year and requires auth', async () => {
    expect((await summary('?month=13&year=2026')).status).toBe(400);
    expect((await summary('?year=1999')).status).toBe(400);
    expect((await api().get('/api/dashboard/summary')).status).toBe(401);
  });
});
