import { isValid, parseISO } from 'date-fns';
import { z } from 'zod';

/**
 * Form schemas mirror the backend Zod validators field-for-field (Plan §13) — same limits,
 * same messages — so the client catches what the server would reject, and the server
 * remains the source of truth. Form fields hold strings; `to*Input` converts on submit.
 */

export const MAX_MONEY = 9_999_999_999.99;

const moneyString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => /^\d+(\.\d+)?$/.test(v), `${label} must be a number`)
    .refine((v) => Number(v) > 0, `${label} must be greater than 0`)
    .refine((v) => !/\.\d{3,}$/.test(v), `${label} can have at most 2 decimal places`)
    .refine((v) => Number(v) <= MAX_MONEY, `${label} is too large`);

const isoDate = (label: string) =>
  z
    .string()
    .min(1, `${label} is required`)
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && isValid(parseISO(v)), `${label} must be a valid date`);

// ─── Auth ────────────────────────────────────────────────────────────────────
const email = z.string().trim().min(1, 'Email is required').max(255).email('Enter a valid email address');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'letter', label: 'At least 1 letter', test: (p: string) => /[A-Za-z]/.test(p) },
  { id: 'number', label: 'At least 1 number', test: (p: string) => /\d/.test(p) },
] as const;

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    email,
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/\d/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

// ─── Expenses ────────────────────────────────────────────────────────────────
export const expenseFormSchema = z.object({
  amount: moneyString('Amount'),
  categoryId: z.string().min(1, 'Choose a category'),
  expenseDate: isoDate('Date'),
  description: z.string().trim().max(255, 'Description must be at most 255 characters'),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const toExpenseInput = (v: ExpenseFormValues) => ({
  amount: Number(v.amount),
  categoryId: v.categoryId,
  expenseDate: v.expenseDate,
  description: v.description.trim() || null,
});

// ─── Budgets ─────────────────────────────────────────────────────────────────
export const budgetFormSchema = z.object({
  categoryId: z.string().min(1, 'Choose a category'),
  limitAmount: moneyString('Limit'),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

// ─── Categories ──────────────────────────────────────────────────────────────
export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Pick a colour'),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
