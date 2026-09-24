import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../test/msw/server';
import { renderWithProviders } from '../../test/utils';
import { ExpenseFormModal } from './ExpenseFormModal';

describe('ExpenseFormModal', () => {
  it('rejects an amount ≤ 0 and missing category without calling the API', async () => {
    const spy = vi.fn();
    server.use(http.post('*/api/expenses', () => { spy(); return HttpResponse.json({}, { status: 201 }); }));
    renderWithProviders(<ExpenseFormModal open onClose={vi.fn()} />);

    await userEvent.type(await screen.findByLabelText('Amount'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(await screen.findByText('Amount must be greater than 0')).toBeInTheDocument();
    expect(screen.getByText('Choose a category')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects more than two decimal places', async () => {
    renderWithProviders(<ExpenseFormModal open onClose={vi.fn()} />);
    await userEvent.type(await screen.findByLabelText('Amount'), '10.555');
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(await screen.findByText('Amount can have at most 2 decimal places')).toBeInTheDocument();
  });

  it('only offers active categories', async () => {
    renderWithProviders(<ExpenseFormModal open onClose={vi.fn()} />);
    const select = await screen.findByLabelText('Category');
    await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(4)); // placeholder + 3 active
    expect(screen.queryByRole('option', { name: /Old Stuff/ })).not.toBeInTheDocument();
  });

  it('submits a valid expense with the API shape and closes', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/expenses', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const onClose = vi.fn();
    renderWithProviders(<ExpenseFormModal open onClose={onClose} />);

    await userEvent.type(await screen.findByLabelText('Amount'), '1234.5');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Food' })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Food');
    await userEvent.type(screen.getByLabelText('Description'), '  Lunch  ');
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(body).toMatchObject({ amount: 1234.5, categoryId: 'c-food', description: 'Lunch' });
    expect(await screen.findByText('Expense added')).toBeInTheDocument();
  });

  it('maps server field errors onto the form', async () => {
    server.use(
      http.post('*/api/expenses', () =>
        HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'bad', details: [{ field: 'categoryId', message: 'Category is archived' }] } }, { status: 400 }),
      ),
    );
    renderWithProviders(<ExpenseFormModal open onClose={vi.fn()} />);
    await userEvent.type(await screen.findByLabelText('Amount'), '10');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Food' })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Food');
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(await screen.findByText('Category is archived')).toBeInTheDocument();
  });
});
