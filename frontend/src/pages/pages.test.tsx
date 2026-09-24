import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { db } from '../test/msw/handlers';
import { emptySummary } from '../test/msw/data';
import { server } from '../test/msw/server';
import { renderApp } from '../test/utils';

/** Page-level tests: every state from Plan §14 (loading, empty, error, success). */

describe('Auth routing', () => {
  it('redirects to /login when the silent refresh fails', async () => {
    db.authenticated = false;
    renderApp('/budgets');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('shows an inline error on invalid credentials, then signs in', async () => {
    db.authenticated = false;
    renderApp('/login');
    await userEvent.type(await screen.findByLabelText('Email address'), 'asha@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Asha/ })).toBeInTheDocument();
  });

  it('maps a duplicate email (409) onto the email field on register', async () => {
    db.authenticated = false;
    renderApp('/register');
    await userEvent.type(await screen.findByLabelText('Full name'), 'Asha');
    await userEvent.type(screen.getByLabelText('Email address'), 'taken@example.com');
    await userEvent.type(screen.getByLabelText('Create password'), 'Passw0rd!');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Passw0rd!');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument();
  });

  it('validates matching passwords client-side', async () => {
    db.authenticated = false;
    renderApp('/register');
    await userEvent.type(await screen.findByLabelText('Create password'), 'Passw0rd!');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Different1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });
});

describe('Dashboard', () => {
  it('renders summary cards from the aggregated API response', async () => {
    renderApp('/dashboard');
    expect(await screen.findByText('₹3,620')).toBeInTheDocument(); // total expenses
    expect(screen.getByText('₹4,000')).toBeInTheDocument(); // total budget
    expect(screen.getByText('₹380')).toBeInTheDocument(); // remaining
    expect(screen.getByText('90.5%')).toBeInTheDocument(); // usage
    expect(screen.getByText('Over Budget')).toBeInTheDocument();
    expect(await screen.findByText('Dinner with friends')).toBeInTheDocument(); // recent expenses
  });

  it('shows the empty state with a CTA when the month has no data', async () => {
    server.use(http.get('*/api/dashboard/summary', () => HttpResponse.json(emptySummary)));
    renderApp('/dashboard');
    expect(await screen.findByText(/Nothing recorded for/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first expense' })).toBeInTheDocument();
  });

  it('shows an error banner that retries', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/dashboard/summary', () => {
        calls += 1;
        return calls === 1 ? HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Database unavailable' } }, { status: 500 }) : HttpResponse.json(emptySummary);
      }),
    );
    renderApp('/dashboard');
    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Nothing recorded for/)).toBeInTheDocument();
  });
});

describe('Expenses', () => {
  it('lists expenses and re-requests with the right query params when filtering', async () => {
    const seen: URLSearchParams[] = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === '/api/expenses') seen.push(url.searchParams);
    });
    renderApp('/expenses');
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);

    const [category] = screen.getAllByLabelText('Category');
    await userEvent.selectOptions(category, 'c-transport');
    await waitFor(() => expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2));
    const last = seen.at(-1)!;
    expect(last.get('categoryId')).toBe('c-transport');
    expect(last.get('page')).toBe('1');
    expect(last.get('startDate')).toMatch(/^\d{4}-\d{2}-01$/);
    server.events.removeAllListeners();
  });

  it('sorts by amount when the header is clicked', async () => {
    const seen: URLSearchParams[] = [];
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === '/api/expenses') seen.push(url.searchParams);
    });
    renderApp('/expenses');
    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('button', { name: /Amount \(INR\)/ }));
    await waitFor(() => expect(seen.at(-1)!.get('sortBy')).toBe('amount'));
    expect(seen.at(-1)!.get('sortOrder')).toBe('desc');
    server.events.removeAllListeners();
  });

  it('does not query the API while min > max, and flags the field', async () => {
    renderApp('/expenses');
    await screen.findByRole('table');
    const [min] = screen.getAllByLabelText('Minimum amount');
    const [max] = screen.getAllByLabelText('Maximum amount');
    await userEvent.type(min, '500');
    await userEvent.type(max, '100');
    expect(await screen.findByText('Max must be ≥ min')).toBeInTheDocument();
  });

  it('shows the empty state when no rows match', async () => {
    renderApp('/expenses');
    await screen.findByRole('table');
    const [search] = screen.getAllByLabelText('Search descriptions');
    await userEvent.type(search, 'zzz-nothing');
    expect(await screen.findByText('No expenses match these filters')).toBeInTheDocument();
  });

  it('deletes after confirmation and removes the row immediately (optimistic)', async () => {
    renderApp('/expenses');
    const table = await screen.findByRole('table');
    await userEvent.click(within(table).getByRole('button', { name: 'Delete Dinner with friends' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
    await waitFor(() => expect(within(screen.getByRole('table')).queryByText('Dinner with friends')).not.toBeInTheDocument());
    expect(await screen.findByText('Expense deleted')).toBeInTheDocument();
  });

  it('restores the row and reports the error when delete fails', async () => {
    server.use(http.delete('*/api/expenses/:id', () => HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }, { status: 500 })));
    renderApp('/expenses');
    const table = await screen.findByRole('table');
    await userEvent.click(within(table).getByRole('button', { name: 'Delete Dinner with friends' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
    expect(await screen.findByText('Couldn’t delete expense')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Dinner with friends')).toBeInTheDocument();
  });
});

describe('Budgets', () => {
  it('shows computed status per budget card', async () => {
    renderApp('/budgets');
    const food = (await screen.findByRole('heading', { name: 'Food', level: 3 })).closest('article')!;
    expect(within(food).getByText('Over Budget')).toBeInTheDocument();
    expect(within(food).getByText('106.7% utilized')).toBeInTheDocument();
  });

  it('shows the 409 duplicate-budget error on the category field', async () => {
    renderApp('/budgets');
    await screen.findByRole('heading', { name: 'Food', level: 3 });
    // Health has no budget → "Set limit" presets it; switch to Food via a stale client list.
    server.use(
      http.post('*/api/budgets', () =>
        HttpResponse.json({ error: { code: 'DUPLICATE_BUDGET', message: 'dup', details: [{ field: 'categoryId', message: 'dup' }] } }, { status: 409 }),
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Set limit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create budget' });
    await userEvent.type(within(dialog).getByLabelText('Monthly limit'), '500');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create budget' }));
    expect(await within(dialog).findByText('A budget for this category already exists this month')).toBeInTheDocument();
  });

  it('excludes already-budgeted categories from the create picker', async () => {
    renderApp('/budgets');
    await screen.findByRole('heading', { name: 'Food', level: 3 });
    await userEvent.click(screen.getByRole('button', { name: 'Create Budget' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create budget' });
    const options = within(within(dialog).getByLabelText('Category')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Select a category', 'Health']);
  });

  it('shows the empty state when there are no budgets', async () => {
    db.budgets = [];
    renderApp('/budgets');
    expect(await screen.findByText(/No budgets for/)).toBeInTheDocument();
  });
});

describe('Categories', () => {
  it('uses "archive" wording, not "delete"', async () => {
    renderApp('/categories');
    await userEvent.click(await screen.findByRole('button', { name: 'Archive Food' }));
    const dialog = await screen.findByRole('dialog', { name: 'Archive this category?' });
    expect(within(dialog).getByText(/history stays intact/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archive category' }));
    expect(await screen.findByText('Category archived')).toBeInTheDocument();
  });

  it('filters the archived tab', async () => {
    renderApp('/categories');
    await screen.findByRole('heading', { name: 'Food', level: 3 });
    await userEvent.click(screen.getByRole('tab', { name: /Archived/ }));
    expect(screen.getByRole('heading', { name: 'Old Stuff', level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Food', level: 3 })).not.toBeInTheDocument();
  });
});

describe('Reports', () => {
  it('renders the monthly audit table and switches to yearly', async () => {
    renderApp('/reports');
    expect(await screen.findByText('Aggregated totals')).toBeInTheDocument();
    expect(screen.getByText('−₹200')).toBeInTheDocument(); // Food variance
    await userEvent.click(screen.getByRole('tab', { name: 'Yearly' }));
    expect(await screen.findByText(/Budget vs actual/)).toBeInTheDocument();
  });

  it('shows the empty state for a period without data', async () => {
    server.use(
      http.get('*/api/reports/monthly', () =>
        HttpResponse.json({ period: { month: 1, year: 2020 }, totalExpenses: 0, totalBudget: 0, remainingBudget: 0, byCategory: [], byDay: [] }),
      ),
    );
    renderApp('/reports');
    expect(await screen.findByText(/No data for/)).toBeInTheDocument();
  });

  it('downloads the export through the authenticated client', async () => {
    let params: URLSearchParams | undefined;
    server.use(
      http.get('*/api/reports/export', ({ request }) => {
        params = new URL(request.url).searchParams;
        return new HttpResponse('csv', { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="rupeeflow-report-2026-09.csv"' } });
      }),
    );
    renderApp('/reports');
    await screen.findByText('Aggregated totals');
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(await screen.findByText('rupeeflow-report-2026-09.csv has been downloaded.')).toBeInTheDocument();
    expect(params?.get('format')).toBe('csv');
    expect(params?.get('period')).toBe('monthly');
  });
});
