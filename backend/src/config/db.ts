import { PrismaClient } from '@prisma/client';
import { env } from './env';

/**
 * Single PrismaClient per process. Prisma manages its own connection pool;
 * tune it with `?connection_limit=N` on DATABASE_URL (Plan §21).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    // Tests deliberately trigger constraint violations; keep their output clean.
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : env.NODE_ENV === 'test' ? [] : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
