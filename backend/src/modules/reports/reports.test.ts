import ExcelJS from 'exceljs';
import type { Response } from 'supertest';
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

let alice: TestUser;
let bob: TestUser;

beforeEach(async () => {
  await resetDb();
  alice = await registerUser();
  bob = await registerUser();
  const food = await categoryId(alice, 'Food');
  const transport = await categoryId(alice, 'Transport');

  await addBudget(alice, { categoryId: food, month: 1, year: 2026, limitAmount: 1000 });
  await addExpense(alice, { categoryId: food, amount: 100, expenseDate: '2025-12-31' }); // prior year
  await addExpense(alice, { categoryId: food, amount: 200, expenseDate: '2026-01-01' });
  await addExpense(alice, { categoryId: food, amount: 300.5, expenseDate: '2026-01-31' });
  await addExpense(alice, { categoryId: transport, amount: 400, expenseDate: '2026-01-31' });
  await addExpense(alice, { categoryId: transport, amount: 50, expenseDate: '2026-02-01' });
  await addExpense(alice, { categoryId: food, amount: 75, expenseDate: '2026-12-31' });
  await addExpense(alice, { categoryId: food, amount: 60, expenseDate: '2027-01-01' }); // next year
  await addExpense(bob, { categoryId: await categoryId(bob, 'Food'), amount: 9999, expenseDate: '2026-01-15' });
});
afterAll(disconnect);

const BOM = String.fromCharCode(0xfeff);
const get = (path: string) => api().get(path).set(alice.auth);

describe('GET /api/reports/monthly', () => {
  it('aggregates one month: Jan 31 in, Feb 1 out', async () => {
    const res = await get('/api/reports/monthly?month=1&year=2026');
    expect(res.status).toBe(200);
    const r = res.body;
    expect(r.period).toEqual({ month: 1, year: 2026 });
    expect(r.totalExpenses).toBe(900.5);
    expect(r.totalBudget).toBe(1000);
    expect(r.remainingBudget).toBe(99.5);
    expect(r.byCategory).toEqual([
      expect.objectContaining({ categoryName: 'Food', total: 500.5, budget: 1000, remaining: 499.5, transactionCount: 2 }),
      expect.objectContaining({ categoryName: 'Transport', total: 400, budget: null, remaining: null }),
    ]);
    expect(r.byDay).toHaveLength(31);
    expect(r.byDay[0]).toEqual({ date: '2026-01-01', total: 200 });
    expect(r.byDay[30]).toEqual({ date: '2026-01-31', total: 700.5 });
    expect(r.byDay[15].total).toBe(0);
  });

  it('returns an empty report for a month without data', async () => {
    const r = (await get('/api/reports/monthly?month=6&year=2026')).body;
    expect(r.totalExpenses).toBe(0);
    expect(r.byCategory).toEqual([]);
    expect(r.byDay).toHaveLength(30);
  });

  it('requires month and year', async () => {
    expect((await get('/api/reports/monthly?year=2026')).status).toBe(400);
    expect((await get('/api/reports/monthly?month=1')).status).toBe(400);
    expect((await get('/api/reports/monthly?month=13&year=2026')).status).toBe(400);
  });
});

describe('GET /api/reports/yearly', () => {
  it('aggregates Jan 1 – Dec 31 only (Dec→Jan rollover)', async () => {
    const r = (await get('/api/reports/yearly?year=2026')).body;
    expect(r.period).toEqual({ year: 2026 });
    expect(r.totalExpenses).toBe(1025.5);
    expect(r.totalBudget).toBe(1000);
    expect(r.byMonth).toHaveLength(12);
    expect(r.byMonth[0]).toEqual({ month: 1, total: 900.5, budget: 1000 });
    expect(r.byMonth[1]).toEqual({ month: 2, total: 50, budget: 0 });
    expect(r.byMonth[11]).toEqual({ month: 12, total: 75, budget: 0 });
    expect(r.byCategory).toEqual([
      expect.objectContaining({ categoryName: 'Food', total: 575.5, transactionCount: 3 }),
      expect.objectContaining({ categoryName: 'Transport', total: 450, transactionCount: 2 }),
    ]);
  });

  it('requires a valid year', async () => {
    expect((await get('/api/reports/yearly')).status).toBe(400);
    expect((await get('/api/reports/yearly?year=abc')).status).toBe(400);
  });
});

/** Collects a binary body so exceljs can parse it. */
const binary = (res: Response, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('GET /api/reports/export', () => {
  it('streams a CSV whose figures match the on-screen monthly report', async () => {
    const screen = (await get('/api/reports/monthly?month=1&year=2026')).body;
    const res = await get('/api/reports/export?format=csv&period=monthly&month=1&year=2026');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['content-disposition']).toBe('attachment; filename="rupeeflow-report-2026-01.csv"');

    const lines = res.text.replace(BOM, '').trim().split(/\r?\n/);
    expect(lines[0]).toContain('January 2026');
    expect(lines).toContain('Category,Transactions,Spent (INR),Budget (INR),Remaining (INR),Used (%)');
    expect(lines).toContain('Food,2,500.5,1000,499.5,50.1');
    expect(lines).toContain('Transport,1,400,,,');
    expect(lines).toContain(`TOTAL,3,${screen.totalExpenses},${screen.totalBudget},${screen.remainingBudget},`);
    expect(lines).toContain('2026-01-31,700.5');
  });

  it('streams a valid XLSX whose figures match the on-screen yearly report', async () => {
    const screen = (await get('/api/reports/yearly?year=2026')).body;
    const res = await get('/api/reports/export?format=xlsx&period=yearly&year=2026').buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toBe('attachment; filename="rupeeflow-report-2026.xlsx"');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body as Buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['By Category', 'By Month']);

    const byCategory = wb.getWorksheet('By Category');
    const rows = byCategory!.getSheetValues().filter(Boolean) as unknown[][];
    const totalRow = rows.find((r) => r.includes('TOTAL'));
    expect(totalRow).toContain(screen.totalExpenses);
    expect(rows.find((r) => r.includes('Food'))).toContain(575.5);

    const byMonth = wb.getWorksheet('By Month')!.getSheetValues().filter(Boolean) as unknown[][];
    expect(byMonth.find((r) => r.includes('January'))).toEqual(expect.arrayContaining([900.5, 1000]));
  });

  it('never leaks another user’s data into an export', async () => {
    const res = await get('/api/reports/export?format=csv&period=yearly&year=2026');
    expect(res.text).not.toContain('9999');
  });

  it.each([
    '?format=pdf&period=monthly&month=1&year=2026',
    '?format=csv&period=weekly&year=2026',
    '?format=csv&period=monthly&year=2026',
    '?format=csv&period=yearly',
  ])('returns 400 for invalid params %s', async (qs) => {
    const res = await get(`/api/reports/export${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    expect((await api().get('/api/reports/export?format=csv&period=yearly&year=2026')).status).toBe(401);
  });
});
