import axios from 'axios';
import { useSyncExternalStore } from 'react';

/**
 * Free-tier hosting (Render) puts the API to sleep when idle; the first request then waits
 * 30–60 s for a cold start, and the hosting proxy may give up first with a 502/503/504.
 * Without help that surfaces as "login failed" or a bounced session.
 *
 * `wakeServer()` polls the cheap, DB-free `/health` endpoint until the API answers. It starts
 * at page load (main.tsx) and gates the silent refresh, login and register, so users wait on a
 * "waking up" notice instead of hitting errors. One shared promise serves every caller.
 */
export type ServerStatus = 'unknown' | 'waking' | 'ready' | 'unreachable';

const HEALTH_URL = `${import.meta.env.VITE_API_URL ?? '/api'}/health`;

export const wakeTiming = {
  /** Per-ping timeout — shorter than proxy timeouts so we keep polling. */
  attemptTimeoutMs: 12_000,
  /** Pause between failed pings. */
  retryDelayMs: 2_500,
  /** Give up (show "unreachable" + retry) after this long. */
  deadlineMs: 120_000,
  /** Only show the "waking up" notice if the first ping is slower than this. */
  noticeDelayMs: 1_500,
};

export class ServerUnreachableError extends Error {
  constructor() {
    super('The server is not responding. Please try again in a moment.');
    this.name = 'ServerUnreachableError';
  }
}

let status: ServerStatus = 'unknown';
const listeners = new Set<() => void>();
let wakePromise: Promise<void> | null = null;

function setStatus(next: ServerStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l());
}

export const getServerStatus = () => status;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves once the API answers /health; rejects after the deadline. Concurrent callers share one wake. */
export function wakeServer(): Promise<void> {
  if (status === 'ready') return Promise.resolve();
  wakePromise ??= (async () => {
    const started = Date.now();
    // A warm server answers instantly — don't flash a notice for that.
    const notice = setTimeout(() => status !== 'ready' && setStatus('waking'), wakeTiming.noticeDelayMs);
    try {
      while (Date.now() - started < wakeTiming.deadlineMs) {
        try {
          await axios.get(HEALTH_URL, { timeout: wakeTiming.attemptTimeoutMs, withCredentials: false });
          setStatus('ready');
          return;
        } catch {
          setStatus('waking');
          await sleep(wakeTiming.retryDelayMs);
        }
      }
      setStatus('unreachable');
      throw new ServerUnreachableError();
    } finally {
      clearTimeout(notice);
      wakePromise = null;
    }
  })();
  return wakePromise;
}

/** Called when a request fails in a way that means the API fell asleep (or never woke). */
export function markServerAsleep() {
  if (status === 'ready') setStatus('unknown');
}

/**
 * True for failures that mean "the API isn't up", not "the API said no": no response at all
 * (network error/timeout) or a gateway error from the hosting proxy.
 */
export function isServerDownError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (!err.response) return err.code !== 'ERR_CANCELED';
  return [502, 503, 504].includes(err.response.status);
}

export function useServerStatus(): ServerStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getServerStatus,
    getServerStatus,
  );
}

/** Test helper: forget any previous wake-up. */
export function resetServerWake() {
  status = 'unknown';
  wakePromise = null;
  listeners.forEach((l) => l());
}
