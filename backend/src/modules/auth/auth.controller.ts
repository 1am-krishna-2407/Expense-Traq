import type { CookieOptions, Request, Response } from 'express';
import { env, isProduction } from '../../config/env';
import { currentUserId } from '../../middleware/authenticate';
import { authService } from './auth.service';
import type { LoginInput, RegisterInput } from './auth.validation';

export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/auth';

/**
 * httpOnly + SameSite + narrow path (Plan §10/§20). SameSite=None (cross-site deploys, §28)
 * requires Secure, so it forces it on.
 */
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction || env.COOKIE_SAMESITE === 'none',
    sameSite: env.COOKIE_SAMESITE,
    path: REFRESH_COOKIE_PATH,
    domain: env.COOKIE_DOMAIN || undefined,
  };
}

const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions(),
    maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  });

const clearRefreshCookie = (res: Response) => res.clearCookie(REFRESH_COOKIE, cookieOptions());

const readRefreshCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const authController = {
  async register(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await authService.register(req.body as RegisterInput);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ user, accessToken });
  },

  async login(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await authService.login(req.body as LoginInput);
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ user, accessToken });
  },

  async refresh(req: Request, res: Response) {
    try {
      const { accessToken, refreshToken } = await authService.refresh(readRefreshCookie(req));
      setRefreshCookie(res, refreshToken);
      res.status(200).json({ accessToken });
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  },

  async logout(req: Request, res: Response) {
    await authService.logout(readRefreshCookie(req));
    clearRefreshCookie(res);
    res.status(204).end();
  },

  async me(req: Request, res: Response) {
    res.json(await authService.me(currentUserId(req)));
  },
};
