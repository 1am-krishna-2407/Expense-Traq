import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../test/msw/server';
import { api, errorMessage, fieldErrors, refreshAccessToken, setSessionExpiredHandler, tokenStore } from './client';

describe('Axios client silent refresh (FE-002)', () => {
  it('replays a 401 once after refreshing, and de-duplicates parallel refreshes', async () => {
    tokenStore.set('expired');
    let refreshCalls = 0;
    server.use(
      http.post('*/api/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json({ accessToken: 'fresh' });
      }),
      http.get('*/api/probe', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer fresh'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'expired' } }, { status: 401 }),
      ),
    );

    const results = await Promise.all([api.get('/probe'), api.get('/probe'), api.get('/probe')]);
    expect(results.every((r) => r.data.ok)).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(tokenStore.get()).toBe('fresh');
  });

  it('gives up after a failed refresh and signals session expiry', async () => {
    tokenStore.set('expired');
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    server.use(
      http.post('*/api/auth/refresh', () => HttpResponse.json({ error: { code: 'INVALID_REFRESH_TOKEN', message: 'no' } }, { status: 401 })),
      http.get('*/api/probe', () => HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'expired' } }, { status: 401 })),
    );
    await expect(api.get('/probe')).rejects.toMatchObject({ response: { status: 401 } });
    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();
    setSessionExpiredHandler(null);
  });

  it('never tries to refresh on auth endpoints (no loops)', async () => {
    let refreshCalls = 0;
    server.use(
      http.post('*/api/auth/refresh', () => {
        refreshCalls += 1;
        return HttpResponse.json({ accessToken: 'x' });
      }),
      http.post('*/api/auth/login', () => HttpResponse.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, { status: 401 })),
    );
    const err = await api.post('/auth/login', { email: 'a', password: 'b' }).catch((e) => e);
    expect(errorMessage(err)).toBe('Invalid email or password');
    expect(refreshCalls).toBe(0);
  });

  it('shares one in-flight refresh promise', async () => {
    const a = refreshAccessToken();
    const b = refreshAccessToken();
    expect(a).toBe(b);
    await a;
  });

  it('extracts field errors from the standard error shape', async () => {
    server.use(
      http.post('*/api/thing', () =>
        HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'bad', details: [{ field: 'amount', message: 'must be greater than 0' }] } }, { status: 400 }),
      ),
    );
    tokenStore.set('t');
    const err = await api.post('/thing', {}).catch((e) => e);
    expect(fieldErrors(err)).toEqual({ amount: 'must be greater than 0' });
  });
});
