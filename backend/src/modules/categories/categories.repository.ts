import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { DEFAULT_CATEGORIES } from './categories.defaults';

const categorySelect = { id: true, name: true, color: true, isArchived: true } as const;

/** Every method takes userId first and scopes its WHERE clause by it (Plan §10/§12). */
export const categoriesRepository = {
  findAll(userId: string, includeArchived: boolean) {
    return prisma.category.findMany({
      where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
      select: categorySelect,
      orderBy: [{ isArchived: 'asc' }, { name: 'asc' }],
    });
  },

  findById(userId: string, id: string) {
    return prisma.category.findFirst({ where: { id, userId }, select: categorySelect });
  },

  /** Case-insensitive name lookup, used for friendly 409s before hitting the unique index. */
  findByName(userId: string, name: string) {
    return prisma.category.findFirst({
      where: { userId, name: { equals: name, mode: 'insensitive' } },
      select: categorySelect,
    });
  },

  create(userId: string, data: { name: string; color?: string | null }) {
    return prisma.category.create({
      data: { userId, name: data.name, color: data.color ?? null },
      select: categorySelect,
    });
  },

  /** Returns null when the row doesn't exist or isn't owned by userId. */
  async update(
    userId: string,
    id: string,
    data: { name?: string; color?: string | null; isArchived?: boolean },
  ) {
    const result = await prisma.category.updateMany({ where: { id, userId }, data });
    if (result.count === 0) return null;
    return prisma.category.findFirst({ where: { id, userId }, select: categorySelect });
  },

  /** Seeds DEFAULT_CATEGORIES for a new user inside the caller's transaction. */
  createDefaults(tx: Prisma.TransactionClient, userId: string) {
    return tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ userId, name: c.name, color: c.color })),
    });
  },
};
