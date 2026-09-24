/**
 * Structural checks for Prisma errors so services can translate DB constraint violations into
 * domain errors without importing Prisma themselves (Plan §12 layering).
 */
const prismaCode = (err: unknown): string | undefined =>
  typeof err === 'object' && err !== null && typeof (err as { code?: unknown }).code === 'string'
    ? (err as { code: string }).code
    : undefined;

/** P2002 — unique constraint violated (e.g. duplicate budget, category name, email). */
export const isUniqueViolation = (err: unknown): boolean => prismaCode(err) === 'P2002';
