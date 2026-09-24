import { http, HttpResponse } from 'msw';
import type { Budget, Expense } from '../../api/types';
import * as data from './data';

/**
 * Mocked API for every module (TEST-002) so page tests run without a live backend.
 * `db` is mutable per test and reset in setup.ts.
 */
export const db = {
  expenses: [] as Expense[],
  budgets: [] as Budget[],
  authenticated: true,
};

export function resetDb() {
  db.expenses = structuredClone(data.expenses);
  db.budgets = structuredClone(data.budgets);
  db.authenticated = true;
}

const unauthorized = () => HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing access token' } }, { status: 401 });

export const handlers = [
  http.post('*/api/auth/refresh', () =>
    db.authenticated ? HttpResponse.json({ accessToken: 'test-token' }) : HttpResponse.json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'Session expired' } }, { status: 401 }),
  ),
  http.get('*/api/auth/me', () => (db.authenticated ? HttpResponse.json({ ...data.user, createdAt: new Date().toISOString() }) : unauthorized())),
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password !== 'Passw0rd!') return HttpResponse.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, { status: 401 });
    db.authenticated = true;
    return HttpResponse.json({ user: data.user, accessToken: 'test-token' });
  }),
  http.post('*/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string };
    if (body.email === 'taken@example.com') {
      return HttpResponse.json({ error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists', details: [{ field: 'email', message: 'taken' }] } }, { status: 409 });
    }
    db.authenticated = true;
    return HttpResponse.json({ user: data.user, accessToken: 'test-token' }, { status: 201 });
  }),
  http.post('*/api/auth/logout', () => {
    db.authenticated = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/categories', ({ request }) => {
    const includeArchived = new URL(request.url).searchParams.get('includeArchived') === 'true';
    return HttpResponse.json(data.categories.filter((c) => includeArchived || !c.isArchived));
  }),
  http.delete('*/api/categories/:id', () => new HttpResponse(null, { status: 204 })),

  http.get('*/api/expenses', ({ request }) => {
    const q = new URL(request.url).searchParams;
    let rows = db.expenses;
    if (q.get('categoryId')) rows = rows.filter((e) => e.categoryId === q.get('categoryId'));
    if (q.get('search')) rows = rows.filter((e) => e.description?.toLowerCase().includes(q.get('search')!.toLowerCase()));
    const page = Number(q.get('page') ?? 1);
    const limit = Number(q.get('limit') ?? 20);
    return HttpResponse.json({
      data: rows.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / limit)) },
    });
  }),
  http.post('*/api/expenses', async ({ request }) => {
    const body = (await request.json()) as { categoryId: string; amount: number; expenseDate: string; description: string | null };
    const e = data.makeExpense(`e-${Date.now()}`, body.categoryId, body.amount, Number(body.expenseDate.slice(8)), body.description ?? '');
    db.expenses = [e, ...db.expenses];
    return HttpResponse.json(e, { status: 201 });
  }),
  http.delete('*/api/expenses/:id', ({ params }) => {
    db.expenses = db.expenses.filter((e) => e.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/budgets', () => HttpResponse.json(db.budgets)),
  http.post('*/api/budgets', async ({ request }) => {
    const body = (await request.json()) as { categoryId: string };
    if (db.budgets.some((b) => b.categoryId === body.categoryId)) {
      return HttpResponse.json({ error: { code: 'DUPLICATE_BUDGET', message: 'A budget for this category already exists this month', details: [{ field: 'categoryId', message: 'dup' }] } }, { status: 409 });
    }
    return HttpResponse.json({ ...data.budgets[1], id: 'b-new', categoryId: body.categoryId }, { status: 201 });
  }),

  http.get('*/api/dashboard/summary', () => HttpResponse.json(data.summary)),
  http.get('*/api/reports/monthly', () => HttpResponse.json(data.monthlyReport)),
  http.get('*/api/reports/yearly', () => HttpResponse.json(data.yearlyReport)),
];
