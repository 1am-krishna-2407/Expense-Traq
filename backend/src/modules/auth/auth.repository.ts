import { prisma } from '../../config/db';
import { categoriesRepository } from '../categories/categories.repository';

const userSelect = { id: true, name: true, email: true, createdAt: true } as const;

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: userSelect });
  },

  /**
   * Transaction (Plan §8): insert the user AND seed default categories atomically, so a
   * partial failure can never leave a user without categories.
   */
  createUserWithDefaults(data: { name: string; email: string; passwordHash: string }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data, select: userSelect });
      await categoriesRepository.createDefaults(tx, user.id);
      return user;
    });
  },

  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    return prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  },

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  /**
   * Transaction (Plan §8/§10): revoke the presented token and insert its successor in one
   * unit. The conditional update (`revokedAt: null`) makes concurrent rotations of the same
   * token safe — only one can win; the loser gets `null` and is treated as reuse.
   */
  rotateRefreshToken(params: {
    currentId: string;
    userId: string;
    newHash: string;
    newExpiresAt: Date;
    now: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: params.currentId, revokedAt: null },
        data: { revokedAt: params.now, replacedByHash: params.newHash },
      });
      if (revoked.count !== 1) return null;
      return tx.refreshToken.create({
        data: { userId: params.userId, tokenHash: params.newHash, expiresAt: params.newExpiresAt },
      });
    });
  },

  /** Reuse detected → kill the whole session family for this user. */
  revokeAllForUser(userId: string, now: Date) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  },

  revokeByHash(tokenHash: string, now: Date) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  },
};
