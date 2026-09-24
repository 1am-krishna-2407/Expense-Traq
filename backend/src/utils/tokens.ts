import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

const ALGORITHM = 'HS256' as const;

export interface AccessTokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

/** Short-lived (default 15 min) HS256 access token: { sub: userId, iat, exp } (Plan §10). */
export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'],
  });
}

/** Verifies signature + expiry. The algorithm is pinned so `alg: none` or RS/HS confusion is rejected. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new jwt.JsonWebTokenError('Malformed token payload');
  }
  return decoded as AccessTokenPayload;
}

/** Opaque 256-bit refresh token — deliberately not a JWT (Plan §10). */
export const generateRefreshToken = (): string => crypto.randomBytes(32).toString('hex');

/** Only the SHA-256 of a refresh token is ever persisted. */
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const refreshTokenExpiry = (from = new Date()): Date =>
  new Date(from.getTime() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
