import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { pageWindow } from '../../lib/pagination';
import { ConfirmDialog } from './ConfirmDialog';
import { Pagination } from './Pagination';
import { ProgressBar } from './ProgressBar';

describe('ConfirmDialog', () => {
  it('fires onConfirm only when the confirm button is pressed', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Delete this expense?" message="Gone forever" confirmLabel="Delete expense" onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByRole('dialog', { name: 'Delete this expense?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Delete expense' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape without confirming', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Sure?" message="x" confirmLabel="Yes" onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} title="Sure?" message="x" confirmLabel="Yes" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Pagination', () => {
  const meta = { page: 2, limit: 10, total: 45, totalPages: 5 };

  it('shows the current range and marks the current page', () => {
    render(<Pagination meta={meta} onPageChange={vi.fn()} />);
    expect(screen.getByText('11–20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('navigates with previous/next/number buttons', async () => {
    const onPageChange = vi.fn();
    render(<Pagination meta={meta} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await userEvent.click(screen.getByRole('button', { name: 'Page 5' }));
    expect(onPageChange.mock.calls).toEqual([[3], [1], [5]]);
  });

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(<Pagination meta={{ ...meta, page: 1 }} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    rerender(<Pagination meta={{ ...meta, page: 5 }} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('changes rows per page', async () => {
    const onLimitChange = vi.fn();
    render(<Pagination meta={meta} onPageChange={vi.fn()} onLimitChange={onLimitChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '50');
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it('collapses long page lists with gaps', () => {
    expect(pageWindow(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4]);
  });
});

describe('ProgressBar', () => {
  it('clamps the bar at 100% but reports the true percentage', () => {
    render(<ProgressBar percent={115} label="Food" />);
    const bar = screen.getByRole('progressbar', { name: 'Food' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar).toHaveAttribute('aria-valuetext', '115.0%');
  });
});
