import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import {
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
  verifyAccessToken,
} from './tokens';

describe('access tokens', () => {
  it('round-trips the user id as `sub` with a 15 minute lifetime', () => {
    const token = signAccessToken('user-1');
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({}, env.JWT_SECRET, { subject: 'u', expiresIn: -10, algorithm: 'HS256' });
    expect(() => verifyAccessToken(token)).toThrow(jwt.TokenExpiredError);
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken('user-1');
    const [h, , s] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'attacker', exp: 9999999999 })).toString('base64url');
    expect(() => verifyAccessToken(`${h}.${forgedPayload}.${s}`)).toThrow();
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign({}, 'another-secret-that-is-also-long-enough!!', { subject: 'u' });
    expect(() => verifyAccessToken(token)).toThrow();
  });

  it('rejects alg:none tokens', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: 'u', exp: 9999999999 })).toString('base64url');
    expect(() => verifyAccessToken(`${header}.${body}.`)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('are 256-bit random hex values', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it('hash deterministically with SHA-256 and never equal the raw token', () => {
    const t = generateRefreshToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).not.toBe(t);
  });

  it('expire after REFRESH_TOKEN_EXPIRY_DAYS', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    expect(refreshTokenExpiry(from).toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});
