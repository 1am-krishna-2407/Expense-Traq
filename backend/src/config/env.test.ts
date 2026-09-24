import { loadEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(40),
};

describe('loadEnv (ARCH-003: boot fails loudly on bad config)', () => {
  it('parses a valid environment and applies defaults', () => {
    const env = loadEnv(valid);
    expect(env.PORT).toBe(4000);
    expect(env.JWT_ACCESS_EXPIRY).toBe('15m');
    expect(env.REFRESH_TOKEN_EXPIRY_DAYS).toBe(30);
    expect(env.BCRYPT_COST).toBe(12);
    expect(env.COOKIE_SAMESITE).toBe('strict');
    expect(env.corsOrigins).toEqual(['http://localhost:5173']);
  });

  it('throws naming JWT_SECRET when it is missing', () => {
    expect(() => loadEnv({ DATABASE_URL: valid.DATABASE_URL })).toThrow(/JWT_SECRET is required/);
  });

  it('throws naming DATABASE_URL when it is missing', () => {
    expect(() => loadEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/DATABASE_URL is required/);
  });

  it('treats empty strings as missing', () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: '' })).toThrow(/JWT_SECRET/);
  });

  it('rejects a short JWT secret', () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/at least 32/);
  });

  it('rejects the example secret in production', () => {
    expect(() =>
      loadEnv({
        ...valid,
        NODE_ENV: 'production',
        JWT_SECRET: 'replace-with-a-long-random-string-at-least-32-chars',
      }),
    ).toThrow(/example value/);
  });

  it('splits multiple CORS origins', () => {
    const env = loadEnv({ ...valid, FRONTEND_ORIGIN: 'https://a.app, https://b.app' });
    expect(env.corsOrigins).toEqual(['https://a.app', 'https://b.app']);
  });
});
