import { z } from 'zod';

export const createAdminSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export const deleteAdminSchema = z.object({
  id: z.string().uuid('ID de usuario inválido'),
});

export type DeleteAdminInput = z.infer<typeof deleteAdminSchema>;
