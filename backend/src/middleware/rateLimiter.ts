import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Brute-force / credential-stuffing mitigation for /auth/login, /auth/register and
 * /auth/refresh (Plan §10, §20). Returns the standard error shape with 429.
 */
export const createAuthRateLimiter = (
  max = env.AUTH_RATE_LIMIT_MAX,
  windowMinutes = env.AUTH_RATE_LIMIT_WINDOW_MINUTES,
) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please wait a few minutes and try again.',
        },
      });
    },
  });
