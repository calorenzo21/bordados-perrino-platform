import { z } from 'zod';

import { PHONE_E164_ERROR_MESSAGE, isE164, normalizePhone } from '@/lib/utils/phone';

/**
 * Phone validator — accepts admin-typed phones in common formats
 * (spaces, dashes, paren, dot, leading `00`) and normalizes them to E.164
 * before persistence. Rejects anything that can't be coerced to
 * `+<country><number>` with 10-15 digits.
 *
 * Why .transform() — every consumer of the parsed value (the route
 * handlers that write to `clients.phone`) gets the normalized form for
 * free. Storage stays consistent regardless of what the operator typed.
 */
const phoneE164 = z
  .string()
  .trim()
  .min(1, 'Teléfono es requerido')
  .max(30, 'Teléfono demasiado largo')
  .transform(normalizePhone)
  .refine(isE164, { message: PHONE_E164_ERROR_MESSAGE });

export const createClientSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(200),
  email: z.string().email('Email inválido'),
  phone: phoneE164,
  cedula: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = z.object({
  clientId: z.string().uuid('ID de cliente inválido'),
  name: z.string().min(1).max(200).optional(),
  email: z.string().email('Email inválido').optional(),
  phone: phoneE164.optional(),
  cedula: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
