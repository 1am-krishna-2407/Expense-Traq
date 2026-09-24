import { z } from 'zod';
import { hexColorSchema, queryBoolean } from '../../utils/validators';

const name = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(1, 'Name is required')
  .max(50, 'Name must be at most 50 characters');

export const listCategoriesQuerySchema = z.object({
  includeArchived: queryBoolean.optional().default('false'),
});

export const createCategorySchema = z.object({
  name,
  color: hexColorSchema.optional().nullable(),
});

export const updateCategorySchema = z
  .object({
    name: name.optional(),
    color: hexColorSchema.nullable().optional(),
    isArchived: z.boolean({ invalid_type_error: 'isArchived must be a boolean' }).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update');

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
