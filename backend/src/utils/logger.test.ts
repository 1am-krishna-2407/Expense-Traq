import { redact } from './logger';

describe('redact (Plan §20: sensitive logging)', () => {
  it('redacts passwords, auth headers and cookies at any depth, case-insensitively', () => {
    const out = redact({
      headers: { Authorization: 'Bearer abc', cookie: 'refresh_token=xyz', 'user-agent': 'jest' },
      body: { email: 'a@b.c', password: 'secret', nested: [{ refreshToken: 'r' }] },
    });
    expect(out).toEqual({
      headers: { Authorization: '[REDACTED]', cookie: '[REDACTED]', 'user-agent': 'jest' },
      body: { email: 'a@b.c', password: '[REDACTED]', nested: [{ refreshToken: '[REDACTED]' }] },
    });
  });

  it('passes primitives through untouched', () => {
    expect(redact('plain')).toBe('plain');
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBeNull();
  });
});
