import { expect, type APIRequestContext, type Page } from '@playwright/test';

export interface E2EUser {
  name: string;
  email: string;
  password: string;
}

export const newUser = (tag = 'e2e'): E2EUser => ({
  name: 'Asha Verma',
  email: `${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`,
  password: 'Passw0rd!',
});

export async function registerViaUi(page: Page, user: E2EUser) {
  await page.goto('/register');
  await page.getByLabel('Full name').fill(user.name);
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Create password').fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function loginViaUi(page: Page, user: E2EUser) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Seeds data straight through the API (fast), using the page's cookie-bearing context. */
export async function apiToken(request: APIRequestContext, user: E2EUser) {
  const res = await request.post('/api/auth/login', { data: { email: user.email, password: user.password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

export async function seed(
  request: APIRequestContext,
  token: string,
  opts: { budgets?: Record<string, number>; expenses: { category: string; amount: number; date: string; description: string }[]; month: number; year: number },
) {
  const headers = { Authorization: `Bearer ${token}` };
  const cats: { id: string; name: string }[] = await (await request.get('/api/categories', { headers })).json();
  const id = (name: string) => cats.find((c) => c.name === name)!.id;
  for (const [name, limit] of Object.entries(opts.budgets ?? {})) {
    const r = await request.post('/api/budgets', { headers, data: { categoryId: id(name), month: opts.month, year: opts.year, limitAmount: limit } });
    expect(r.status()).toBe(201);
  }
  for (const e of opts.expenses) {
    const r = await request.post('/api/expenses', { headers, data: { categoryId: id(e.category), amount: e.amount, expenseDate: e.date, description: e.description } });
    expect(r.status()).toBe(201);
  }
}

export const currentMonth = () => {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear(), iso: (day: number) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
};
