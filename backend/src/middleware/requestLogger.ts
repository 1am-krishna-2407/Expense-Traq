import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const LOGGED_HEADERS = ['user-agent', 'content-type', 'authorization', 'cookie', 'origin'];

/**
 * Structured access log. Sensitive values (Authorization, Cookie, password fields) are
 * redacted by the logger before anything is written (Plan §20).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  if (!env.LOG_REQUESTS) return next();
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const headers = Object.fromEntries(
      LOGGED_HEADERS.filter((h) => req.headers[h] !== undefined).map((h) => [h, req.headers[h]]),
    );
    logger.info('request', {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Number((process.hrtime.bigint() - started) / 1_000_000n),
      userId: req.user?.id,
      ip: req.ip,
      headers,
    });
  });
  next();
}
