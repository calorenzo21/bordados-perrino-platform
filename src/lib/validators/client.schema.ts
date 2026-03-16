import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(200),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'Teléfono es requerido').max(30),
  cedula: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  clientId: z.string().uuid('ID de cliente inválido'),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(1).max(30).optional(),
  cedula: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
