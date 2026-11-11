import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { db } from '../test/msw/handlers';
import { server } from '../test/msw/server';
import { renderApp } from '../test/utils';
import { api, setSessionExpiredHandler, tokenStore } from './client';
import { getServerStatus, ServerUnreachableError, wakeServer } from './serverWake';

/** Simulates a free-tier API that answers 503 for the first `n` health checks. */
function sleepingFor(n: number) {
  let calls = 0;
  server.use(
    http.get('*/api/health', () => {
      calls += 1;
      return calls <= n ? new HttpResponse('Service Unavailable', { status: 503 }) : HttpResponse.json({ status: 'ok' });
    }),
  );
  return () => calls;
}

describe('wakeServer', () => {
  it('polls /health until the API answers', async () => {
    const calls = sleepingFor(2);
    await wakeServer();
    expect(calls()).toBe(3);
    expect(getServerStatus()).toBe('ready');
  });

  it('shares one wake-up between concurrent callers and skips it once ready', async () => {
    const calls = sleepingFor(1);
    await Promise.all([wakeServer(), wakeServer(), wakeServer()]);
    expect(calls()).toBe(2);
    await wakeServer();
    expect(calls()).toBe(2);
  });

  it('gives up after the deadline as "unreachable"', async () => {
    sleepingFor(Infinity);
    await expect(wakeServer()).rejects.toBeInstanceOf(ServerUnreachableError);
    expect(getServerStatus()).toBe('unreachable');
  });
});

describe('API client while the server sleeps', () => {
  it('wakes the server and replays a GET that hit a gateway error', async () => {
    tokenStore.set('t');
    let probes = 0;
    server.use(
      http.get('*/api/probe', () => {
        probes += 1;
        return probes === 1 ? new HttpResponse(null, { status: 502 }) : HttpResponse.json({ ok: true });
      }),
    );
    const res = await api.get('/probe');
    expect(res.data).toEqual({ ok: true });
    expect(probes).toBe(2);
  });

  it('never replays a write (it might still be processed — no duplicate expenses)', async () => {
    tokenStore.set('t');
    let posts = 0;
    server.use(
      http.post('*/api/expenses', () => {
        posts += 1;
        return new HttpResponse(null, { status: 504 });
      }),
    );
    await expect(api.post('/expenses', {})).rejects.toMatchObject({ response: { status: 504 } });
    expect(posts).toBe(1);
  });

  it('does not log the user out when a token refresh hits a sleeping server', async () => {
    tokenStore.set('expired');
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    server.use(
      http.get('*/api/probe', () => HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'expired' } }, { status: 401 })),
      http.post('*/api/auth/refresh', () => new HttpResponse(null, { status: 503 })),
    );
    await expect(api.get('/probe')).rejects.toBeTruthy();
    expect(onExpired).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBe('expired');
    setSessionExpiredHandler(null);
  });
});

describe('login against a sleeping backend', () => {
  it('waits for the wake-up instead of failing, then signs in', async () => {
    db.authenticated = false;
    let loginCalls = 0;
    let awake = false;
    server.use(
      http.get('*/api/health', () => (awake ? HttpResponse.json({ status: 'ok' }) : new HttpResponse(null, { status: 503 }))),
      http.post('*/api/auth/login', () => {
        loginCalls += 1;
        return HttpResponse.json({ user: { id: 'u-1', name: 'Asha Verma', email: 'asha@example.com' }, accessToken: 't' });
      }),
    );
    renderApp('/login');
    // Session restore can't complete while asleep → login form, plus the notice.
    expect(await screen.findByText('Waking up the server…')).toBeInTheDocument();
    awake = true;
    await userEvent.type(await screen.findByLabelText('Email address'), 'asha@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('heading', { name: /Asha/ })).toBeInTheDocument();
    expect(loginCalls).toBe(1);
  });
});
