import { useServerStatus, wakeServer } from '../../api/serverWake';
import { Icon } from '../ui/Icon';
import { Spinner } from '../ui/Spinner';

/**
 * Explains the pause while a sleeping (free-tier) API cold-starts, so a slow first login
 * reads as "waking up", not "broken". Offers a retry if it never answers.
 */
export function ServerStatusNotice() {
  const status = useServerStatus();
  if (status !== 'waking' && status !== 'unreachable') return null;

  const waking = status === 'waking';
  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[110] flex justify-center">
      <div
        role={waking ? 'status' : 'alert'}
        aria-live="polite"
        className="card pointer-events-auto flex w-full max-w-lg animate-slide-up items-start gap-3 p-3.5 shadow-float"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${waking ? 'bg-primary/10 text-primary-fg' : 'bg-danger/10 text-danger-fg'}`}
        >
          {waking ? <Spinner size={16} /> : <Icon name="cloud_off" size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{waking ? 'Waking up the server…' : 'The server isn’t responding'}</p>
          <p className="mt-0.5 text-body-sm text-muted">
            {waking
              ? 'It sleeps when nobody has used it for a while. This usually takes under a minute — you can keep filling in the form.'
              : 'It may still be starting up or temporarily down.'}
          </p>
        </div>
        {!waking && (
          <button
            type="button"
            onClick={() => void wakeServer().catch(() => undefined)}
            className="rounded-control px-2.5 py-1.5 text-body-sm font-semibold text-primary-fg hover:bg-hover"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
