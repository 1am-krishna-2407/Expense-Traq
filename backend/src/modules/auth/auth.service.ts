import { isUniqueViolation } from '../../utils/dbErrors';
import { conflict, notFound, unauthorized } from '../../utils/errors';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../utils/hash';
import { logger } from '../../utils/logger';
import {
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../../utils/tokens';
import { authRepository } from './auth.repository';
import type { AuthResult, MeResponse, PublicUser, RefreshResult } from './auth.types';
import type { LoginInput, RegisterInput } from './auth.validation';

const invalidRefresh = () => unauthorized('Session expired. Please sign in again.', 'INVALID_REFRESH_TOKEN');

async function issueSession(user: PublicUser): Promise<AuthResult> {
  const refreshToken = generateRefreshToken();
  await authRepository.createRefreshToken(user.id, hashToken(refreshToken), refreshTokenExpiry());
  return {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken: signAccessToken(user.id),
    refreshToken,
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) throw conflict('EMAIL_TAKEN', 'An account with this email already exists', 'email');

    const passwordHash = await hashPassword(input.password);
    try {
      const user = await authRepository.createUserWithDefaults({
        name: input.name,
        email: input.email,
        passwordHash,
      });
      return issueSession(user);
    } catch (err) {
      // Lost a race with a concurrent registration for the same email.
      if (isUniqueViolation(err)) {
        throw conflict('EMAIL_TAKEN', 'An account with this email already exists', 'email');
      }
      throw err;
    }
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await authRepository.findUserByEmail(input.email);
    const valid = user
      ? await verifyPassword(input.password, user.passwordHash)
      : await burnPasswordCheck(input.password);
    // Generic message: never reveal whether the email exists (Plan §11).
    if (!user || !valid) throw unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    return issueSession(user);
  },

  /** Rotation + reuse detection, in the order specified by Plan §10. */
  async refresh(rawToken: string | undefined): Promise<RefreshResult> {
    if (!rawToken) throw invalidRefresh();
    const now = new Date();
    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawToken));

    if (!stored) throw invalidRefresh();

    if (stored.revokedAt) {
      await authRepository.revokeAllForUser(stored.userId, now);
      logger.warn('refresh_token_reuse_detected', { userId: stored.userId, tokenId: stored.id });
      throw invalidRefresh();
    }

    if (stored.expiresAt <= now) throw invalidRefresh();

    const newToken = generateRefreshToken();
    const rotated = await authRepository.rotateRefreshToken({
      currentId: stored.id,
      userId: stored.userId,
      newHash: hashToken(newToken),
      newExpiresAt: refreshTokenExpiry(now),
      now,
    });
    if (!rotated) {
      // Someone rotated this token between our read and our write — treat as reuse.
      await authRepository.revokeAllForUser(stored.userId, now);
      throw invalidRefresh();
    }

    return { accessToken: signAccessToken(stored.userId), refreshToken: newToken };
  },

  /** Idempotent: unknown/absent tokens are simply ignored. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await authRepository.revokeByHash(hashToken(rawToken), new Date());
  },

  async me(userId: string): Promise<MeResponse> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw notFound('User');
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt.toISOString() };
  },
};
