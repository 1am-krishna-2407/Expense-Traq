import { expect, test } from '@playwright/test';
import { apiToken, currentMonth, loginViaUi, newUser, registerViaUi, seed } from './helpers';

/** Scenarios from Plan §22 "End-to-end (Playwright)". */

test('register → auto-login lands on the empty dashboard', async ({ page }) => {
  await registerViaUi(page, newUser('register'));
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Asha/ })).toBeVisible();
  await expect(page.getByText(/Nothing recorded for/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add your first expense' })).toBeVisible();
});

test('login → session persists across a page reload (refresh cookie)', async ({ page }) => {
  const user = newUser('persist');
  await registerViaUi(page, user);
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await loginViaUi(page, user);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Asha/ })).toBeVisible();
});

test('wrong password shows an inline error', async ({ page }) => {
  const user = newUser('badpw');
  await registerViaUi(page, user);
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('Wrong12345');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
});

test('create category → create expense → dashboard reflects the new total', async ({ page }) => {
  await registerViaUi(page, newUser('flow'));

  await page.getByRole('link', { name: 'Categories' }).click();
  await page.getByRole('button', { name: 'Add Category' }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Pets');
  await page.getByRole('dialog').getByRole('button', { name: 'Add category' }).click();
  await expect(page.getByRole('heading', { name: 'Pets', level: 3 })).toBeVisible();

  await page.getByRole('button', { name: 'Add Expense' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Amount').fill('1234.50');
  await dialog.getByLabel('Category').selectOption({ label: 'Pets' });
  await dialog.getByLabel('Description').fill('Vet visit');
  await dialog.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByText('Expense added')).toBeVisible();

  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByText('₹1,234.50').first()).toBeVisible();
  await expect(page.getByText('Vet visit')).toBeVisible();
});

test('budget → overspend shows the over-limit state; edit and delete recompute totals', async ({ page, request }) => {
  const user = newUser('budget');
  await registerViaUi(page, user);
  const { month, year, iso } = currentMonth();
  const token = await apiToken(request, user);
  await seed(request, token, { month, year, budgets: { Food: 1000 }, expenses: [{ category: 'Food', amount: 900, date: iso(1), description: 'Groceries' }] });

  await page.getByRole('link', { name: 'Budgets' }).click();
  const card = page.locator('article', { hasText: 'Food' });
  await expect(card.getByText('90% utilized')).toBeVisible();
  await expect(card.getByText('Near Limit')).toBeVisible();

  // Push it over the limit via the UI
  await page.getByRole('button', { name: 'Add Expense' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Amount').fill('250');
  await dialog.getByLabel('Category').selectOption({ label: 'Food' });
  await dialog.getByRole('button', { name: 'Add expense' }).click();
  await expect(card.getByText('Over Budget')).toBeVisible();
  await expect(card.getByText('115% utilized')).toBeVisible();

  // Edit then delete the new expense on the Expenses page
  await page.getByRole('link', { name: 'Expenses' }).click();
  await page.getByRole('button', { name: /^Edit / }).first().click();
  await page.getByRole('dialog').getByLabel('Amount').fill('50');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Expense updated')).toBeVisible();

  await page.getByRole('link', { name: 'Budgets' }).click();
  await expect(card.getByText('95% utilized')).toBeVisible();

  await page.getByRole('link', { name: 'Expenses' }).click();
  await page.getByRole('button', { name: /^Delete / }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete expense' }).click();
  await expect(page.getByText('Expense deleted')).toBeVisible();
  await page.getByRole('link', { name: 'Budgets' }).click();
  await expect(card.getByText(/^(90|5)% utilized$/)).toBeVisible();
});

test('filter expenses by category, amount and search', async ({ page, request }) => {
  const user = newUser('filter');
  await registerViaUi(page, user);
  const { month, year, iso } = currentMonth();
  await seed(request, await apiToken(request, user), {
    month,
    year,
    expenses: [
      { category: 'Food', amount: 120, date: iso(1), description: 'Coffee beans' },
      { category: 'Food', amount: 2400, date: iso(1), description: 'Team dinner' },
      { category: 'Transport', amount: 600, date: iso(1), description: 'Cab to airport' },
    ],
  });
  await page.getByRole('link', { name: 'Expenses' }).click();
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(4); // header + 3

  await page.getByLabel('Category').selectOption({ label: 'Food' });
  await expect(table.getByRole('row')).toHaveCount(3);

  await page.getByRole('button', { name: 'Above ₹5,000' }).click();
  await expect(page.getByText('No expenses match these filters')).toBeVisible();
  await page.getByRole('button', { name: '₹1,000 – ₹5,000' }).click();
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table).toContainText('Team dinner');

  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByPlaceholder('Search by description…').fill('cab');
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table).toContainText('Cab to airport');
});

test('monthly report downloads a CSV that matches the screen', async ({ page, request }) => {
  const user = newUser('report');
  await registerViaUi(page, user);
  const { month, year, iso } = currentMonth();
  await seed(request, await apiToken(request, user), {
    month,
    year,
    budgets: { Food: 5000 },
    expenses: [{ category: 'Food', amount: 1500, date: iso(1), description: 'Groceries' }],
  });
  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByText('Aggregated totals')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`rupeeflow-report-${year}-${String(month).padStart(2, '0')}.csv`);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('Food,1,1500,5000,3500,30');
});

test('logout → protected routes redirect to /login', async ({ page }) => {
  await registerViaUi(page, newUser('logout'));
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/budgets');
  await expect(page).toHaveURL(/\/login$/);
});

test('@mobile-only bottom navigation, FAB and filter sheet work at phone width', async ({ page }) => {
  await registerViaUi(page, newUser('mobile'));
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav).toBeVisible();
  await nav.getByRole('link', { name: 'Expenses' }).click();
  await expect(page).toHaveURL(/\/expenses$/);
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page.getByRole('dialog', { name: 'Filter expenses' })).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await nav.getByRole('button', { name: 'Add expense' }).click();
  await expect(page.getByRole('dialog', { name: 'Add expense' })).toBeVisible();
  // No horizontal page scroll at phone width
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
