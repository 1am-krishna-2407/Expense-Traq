import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  icon?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Fires onConfirm only when the confirm button is pressed (Plan §22 component test). */
export function ConfirmDialog({ open, title, message, confirmLabel, tone = 'danger', icon = 'delete', loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      icon={
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-danger/10 text-danger-fg' : 'bg-primary/10 text-primary-fg'}`}
        >
          <Icon name={icon} size={20} />
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-body-md text-muted">{message}</div>
    </Modal>
  );
}
