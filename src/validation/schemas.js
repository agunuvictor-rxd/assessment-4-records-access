import { z } from 'zod';

/**
 * Validation schemas for records operations.
 * All validation is server-side — client-side mirrors these rules for UX only.
 */

export const createRecordSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .trim(),
  content: z
    .string()
    .max(10000, 'Content must not exceed 10,000 characters')
    .default(''),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must not exceed 50 characters')
    .trim()
    .default('general'),
});

export const updateRecordSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters')
    .trim()
    .optional(),
  content: z
    .string()
    .max(10000, 'Content must not exceed 10,000 characters')
    .optional(),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must not exceed 50 characters')
    .trim()
    .optional(),
});

export const deleteRecordSchema = z.object({
  reason: z
    .string()
    .min(1, 'Deletion reason is required for audit trail')
    .max(500, 'Reason must not exceed 500 characters')
    .trim(),
});

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters')
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters'),
});

export const signinSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});
