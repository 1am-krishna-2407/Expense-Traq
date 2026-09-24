import jwt from 'jsonwebtoken';
import request from 'supertest';
import { api, disconnect, extractRefreshCookie, registerUser, resetDb } from '../../../tests/helpers';
import { createApp } from '../../app';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { createAuthRateLimiter } from '../../middleware/rateLimiter';
import { hashToken } from '../../utils/tokens';
import { categoriesRepository } from '../categories/categories.repository';
import { DEFAULT_CATEGORIES } from '../categories/categories.defaults';

beforeEach(resetDb);
afterAll(disconnect);

const rawToken = (cookie: string) => cookie.split('=')[1];

describe('POST /api/auth/register', () => {
  it('creates the user, seeds default categories, returns an access token and sets the refresh cookie', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: '  Asha  ', email: 'Asha@Example.com', password: 'Passw0rd!' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(String), name: 'Asha', email: 'asha@example.com' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(typeof res.body.accessToken).toBe('string');

    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('refresh_token='));
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/auth/);

    const categories = await prisma.category.findMany({ where: { userId: res.body.user.id } });
    expect(categories.map((c) => c.name).sort()).toEqual(DEFAULT_CATEGORIES.map((c) => c.name).sort());

    // Only the hash of the refresh token is stored.
    const token = rawToken(extractRefreshCookie(res.headers['set-cookie']));
    const stored = await prisma.refreshToken.findFirst({ where: { userId: res.body.user.id } });
    expect(stored?.tokenHash).toBe(hashToken(token));
    expect(stored?.tokenHash).not.toBe(token);
  });

  it('rejects a duplicate email case-insensitively with 409', async () => {
    await registerUser({ email: 'dup@example.com' });
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'X', email: 'DUP@example.com', password: 'Passw0rd!' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(res.body.error.details[0].field).toBe('email');
  });

  it.each([
    [{ name: '', email: 'a@b.co', password: 'Passw0rd!' }, 'name'],
    [{ name: 'A', email: 'not-an-email', password: 'Passw0rd!' }, 'email'],
    [{ name: 'A', email: 'a@b.co', password: 'short1' }, 'password'],
    [{ name: 'A', email: 'a@b.co', password: 'nodigitshere' }, 'password'],
    [{ name: 'A', email: 'a@b.co', password: '12345678' }, 'password'],
  ])('returns 400 with field details for invalid input %#', async (body, field) => {
    const res = await api().post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
  });

  it('is atomic: if seeding categories fails, no user row is left behind (A7)', async () => {
    const spy = jest.spyOn(categoriesRepository, 'createDefaults').mockRejectedValueOnce(new Error('boom'));
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'A', email: 'atomic@example.com', password: 'Passw0rd!' });
    spy.mockRestore();
    quiet.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(await prisma.user.count({ where: { email: 'atomic@example.com' } })).toBe(0);
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await api().post('/api/auth/register').set('Content-Type', 'application/json').send('{"name":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials (email case-insensitive)', async () => {
    const user = await registerUser({ email: 'login@example.com' });
    const res = await api().post('/api/auth/login').send({ email: 'LOGIN@example.com', password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.accessToken).toBeDefined();
    expect(extractRefreshCookie(res.headers['set-cookie'])).toMatch(/^refresh_token=[0-9a-f]{64}$/);
  });

  it('returns the same generic 401 for a wrong password and an unknown email', async () => {
    const user = await registerUser();
    const wrong = await api().post('/api/auth/login').send({ email: user.email, password: 'Wrong1234' });
    const unknown = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Wrong1234' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.message).toBe('Invalid email or password');
  });

  it('returns 400 when the password is empty', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'a@b.co', password: '' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh', () => {
  it('rotates: issues a new access token + cookie and revokes the old token', async () => {
    const user = await registerUser();
    const res = await api().post('/api/auth/refresh').set('Cookie', user.cookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    const newCookie = extractRefreshCookie(res.headers['set-cookie']);
    expect(newCookie).not.toBe(user.cookie);

    const old = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken(user.cookie)) } });
    expect(old?.revokedAt).not.toBeNull();
    expect(old?.replacedByHash).toBe(hashToken(rawToken(newCookie)));

    // The new access token works.
    const me = await api().get('/api/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
  });

  it('detects reuse of a rotated token and revokes the whole session family', async () => {
    const user = await registerUser();
    const first = await api().post('/api/auth/refresh').set('Cookie', user.cookie);
    const newCookie = extractRefreshCookie(first.headers['set-cookie']);

    // Attacker replays the already-rotated cookie.
    const replay = await api().post('/api/auth/refresh').set('Cookie', user.cookie);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('INVALID_REFRESH_TOKEN');

    // The legitimate successor has been killed too.
    const legit = await api().post('/api/auth/refresh').set('Cookie', newCookie);
    expect(legit.status).toBe(401);
    expect(await prisma.refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
  });

  it('only one of two concurrent refreshes with the same token succeeds', async () => {
    const user = await registerUser();
    const results = await Promise.all([
      api().post('/api/auth/refresh').set('Cookie', user.cookie),
      api().post('/api/auth/refresh').set('Cookie', user.cookie),
    ]);
    expect(results.filter((r) => r.status === 200).length).toBeLessThanOrEqual(1);
    expect(results.some((r) => r.status === 401)).toBe(true);
  });

  it('returns 401 when the cookie is missing', async () => {
    const res = await api().post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an unknown token', async () => {
    const res = await api().post('/api/auth/refresh').set('Cookie', `refresh_token=${'a'.repeat(64)}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const user = await registerUser();
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await api().post('/api/auth/refresh').set('Cookie', user.cookie);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the token, clears the cookie and is idempotent', async () => {
    const user = await registerUser();
    const res = await api().post('/api/auth/logout').set('Cookie', user.cookie);
    expect(res.status).toBe(204);
    const cleared = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('refresh_token='));
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);

    const after = await api().post('/api/auth/refresh').set('Cookie', user.cookie);
    expect(after.status).toBe(401);

    expect((await api().post('/api/auth/logout')).status).toBe(204);
  });
});

describe('GET /api/auth/me and the authenticate middleware', () => {
  it('returns the current user', async () => {
    const user = await registerUser({ name: 'Me Myself' });
    const res = await api().get('/api/auth/me').set(user.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: user.id, name: 'Me Myself', email: user.email, createdAt: expect.any(String) });
  });

  it('rejects a missing token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed JWT', async () => {
    const res = await api().get('/api/auth/me').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('rejects an expired access token', async () => {
    const user = await registerUser();
    const expired = jwt.sign({}, env.JWT_SECRET, { subject: user.id, expiresIn: -5, algorithm: 'HS256' });
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Access token expired');
  });

  it('rejects an alg:none token', async () => {
    const user = await registerUser();
    const h = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url');
    const p = Buffer.from(JSON.stringify({ sub: user.id, exp: 9999999999 })).toString('base64url');
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${h}.${p}.`);
    expect(res.status).toBe(401);
  });
});

describe('rate limiting', () => {
  it('returns 429 in the standard error shape once the budget is spent', async () => {
    const limitedApp = createApp({ auth: { credentialLimiter: createAuthRateLimiter(2, 15) } });
    const attempt = () => request(limitedApp).post('/api/auth/login').send({ email: 'x@y.co', password: 'nope' });
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('platform', () => {
  it('serves /health', async () => {
    expect((await api().get('/health')).body.status).toBe('ok');
  });

  it('returns the standard 404 shape for unknown routes', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sets security headers (helmet) and whitelists only the configured CORS origin', async () => {
    const ok = await api().get('/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');

    const evil = await api().get('/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });
});
