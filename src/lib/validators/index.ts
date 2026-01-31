/**
 * Zod Validation Schemas
 *
 * This folder contains all Zod schemas for validation.
 * Each domain should have its own schema file following the pattern: <domain>.schema.ts
 *
 * Conventions:
 * - All input validation uses Zod schemas
 * - Schemas are used in both API Routes and form validation
 * - Export both the schema and the inferred TypeScript type
 *
 * Example:
 * export const createOrderSchema = z.object({ ... });
 * export type CreateOrderInput = z.infer<typeof createOrderSchema>;
 */

import { z } from 'zod';

// Common schemas that can be reused across domains
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const idSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export type IdInput = z.infer<typeof idSchema>;

