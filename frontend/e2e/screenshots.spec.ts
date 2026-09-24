import { test } from '@playwright/test';
import { apiToken, currentMonth, newUser, registerViaUi, seed } from './helpers';

/**
 * Visual QA pass (Plan §23 Phase 10: "device-width QA"). Captures every page in both
 * themes at desktop and phone widths into e2e/screenshots/. Opt-in: `npx playwright test --grep @visual`.
 */
test.skip(!process.env.VISUAL, 'set VISUAL=1 to capture screenshots');

const PAGES = ['dashboard', 'expenses', 'budgets', 'categories', 'reports'];

test('@visual @mobile capture all pages', async ({ page, request }, testInfo) => {
  const user = newUser('visual');
  await registerViaUi(page, user);
  const { month, year, iso } = currentMonth();
  const day = Math.min(new Date().getDate(), 28);
  await seed(request, await apiToken(request, user), {
    month,
    year,
    budgets: { Food: 10000, Transport: 6000, Utilities: 5000, Entertainment: 3000, Health: 4000 },
    expenses: [
      { category: 'Food', amount: 850, date: iso(Math.max(1, day - 1)), description: 'Dinner with friends' },
      { category: 'Food', amount: 2350, date: iso(Math.max(1, day - 4)), description: 'Groceries — BigBasket' },
      { category: 'Food', amount: 5200, date: iso(Math.max(1, day - 8)), description: 'Anniversary dinner' },
      { category: 'Transport', amount: 420, date: iso(day), description: 'Uber to HSR Layout' },
      { category: 'Transport', amount: 4800, date: iso(Math.max(1, day - 2)), description: 'Flight change fee' },
      { category: 'Utilities', amount: 1850, date: iso(Math.max(1, day - 3)), description: 'Electricity bill' },
      { category: 'Entertainment', amount: 3400, date: iso(Math.max(1, day - 5)), description: 'Concert tickets' },
      { category: 'Health', amount: 2100, date: iso(Math.max(1, day - 6)), description: 'Pharmacy' },
      { category: 'Other', amount: 999, date: iso(Math.max(1, day - 7)), description: 'Gift wrap' },
    ],
  });

  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((t) => localStorage.setItem('rf-theme', t), theme);
    for (const p of PAGES) {
      await page.goto(`/${p}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(700); // let charts animate in
      await page.screenshot({ path: `e2e/screenshots/${testInfo.project.name}-${theme}-${p}.png`, fullPage: true });
    }
  }
});
