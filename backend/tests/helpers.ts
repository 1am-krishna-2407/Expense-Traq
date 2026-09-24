import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/db';

export const app = createApp();
export const api = () => request(app);

/**
 * Empties every table between tests. CASCADE follows the FKs from users. Guarded so it can
 * only ever run against a database whose name ends in "_test".
 */
export async function resetDb() {
  const dbName = new URL(process.env.DATABASE_URL ?? '').pathname.replace(/^\//, '');
  if (process.env.NODE_ENV !== 'test' || !dbName.endsWith('_test')) {
    throw new Error(`resetDb refused: "${dbName}" is not a test database`);
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE refresh_tokens, expenses, budgets, categories, users RESTART IDENTITY CASCADE',
  );
}

export async function disconnect() {
  await prisma.$disconnect();
}

let counter = 0;

export interface TestUser {
  id: string;
  email: string;
  password: string;
  token: string;
  /** Raw `refresh_token=...` cookie pair for supertest's .set('Cookie', ...) */
  cookie: string;
  auth: { Authorization: string };
}

export const extractRefreshCookie = (setCookie: string[] | string | undefined): string => {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const found = list.find((c) => c.startsWith('refresh_token='));
  if (!found) throw new Error('No refresh_token cookie set');
  return found.split(';')[0];
};

export async function registerUser(overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  counter += 1;
  const body = {
    name: overrides.name ?? `User ${counter}`,
    email: overrides.email ?? `user${counter}.${Date.now()}@example.com`,
    password: overrides.password ?? 'Passw0rd!',
  };
  const res = await api().post('/api/auth/register').send(body);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const user: TestUser = {
    id: res.body.user.id,
    email: body.email,
    password: body.password,
    token: res.body.accessToken,
    cookie: extractRefreshCookie(res.headers['set-cookie']),
    auth: { Authorization: `Bearer ${res.body.accessToken}` },
  };
  return user;
}

export async function categoriesOf(user: TestUser): Promise<{ id: string; name: string }[]> {
  const res = await api().get('/api/categories').set(user.auth);
  return res.body;
}

export async function categoryId(user: TestUser, name: string): Promise<string> {
  const found = (await categoriesOf(user)).find((c) => c.name === name);
  if (!found) throw new Error(`category ${name} not found`);
  return found.id;
}

export async function addExpense(
  user: TestUser,
  body: { categoryId: string; amount: number; expenseDate: string; description?: string },
) {
  const res = await api().post('/api/expenses').set(user.auth).send(body);
  if (res.status !== 201) throw new Error(`addExpense failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string };
}

export async function addBudget(
  user: TestUser,
  body: { categoryId: string; month: number; year: number; limitAmount: number },
) {
  const res = await api().post('/api/budgets').set(user.auth).send(body);
  if (res.status !== 201) throw new Error(`addBudget failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { id: string };
}

export const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';
