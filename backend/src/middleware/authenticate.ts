import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/errors';
import { verifyAccessToken } from '../utils/tokens';

export interface AuthUser {
  id: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

/**
 * Verifies `Authorization: Bearer <jwt>` and attaches `req.user = { id }`.
 * Missing, malformed, tampered and expired tokens all yield 401 (Plan §10).
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized('Missing access token'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError ? 'Access token expired' : 'Invalid access token';
    next(unauthorized(message));
  }
}

/** Reads the authenticated user id; only call behind `authenticate`. */
export function currentUserId(req: Request): string {
  if (!req.user) throw unauthorized();
  return req.user.id;
}
