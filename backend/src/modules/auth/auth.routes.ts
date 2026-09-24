import { Router, type RequestHandler } from 'express';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/authenticate';
import { createAuthRateLimiter } from '../../middleware/rateLimiter';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { authController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.validation';

export interface AuthRouterOptions {
  /** Shared by /login and /register (credential brute-force protection). */
  credentialLimiter?: RequestHandler;
  /** /refresh runs on every page load, so it gets a more generous budget. */
  refreshLimiter?: RequestHandler;
}

export function createAuthRouter({
  credentialLimiter = createAuthRateLimiter(),
  refreshLimiter = createAuthRateLimiter(env.AUTH_RATE_LIMIT_MAX * 6),
}: AuthRouterOptions = {}) {
  const router = Router();

  router.post('/register', credentialLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
  router.post('/login', credentialLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
  router.post('/refresh', refreshLimiter, asyncHandler(authController.refresh));
  router.post('/logout', asyncHandler(authController.logout));
  router.get('/me', authenticate, asyncHandler(authController.me));

  return router;
}
