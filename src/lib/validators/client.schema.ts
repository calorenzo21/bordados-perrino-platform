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
  .transform((s) => normalizePhone(s))
  .refine(isE164, { message: PHONE_E164_ERROR_MESSAGE });

// Normaliza un campo "ausente" a `undefined`. El frontend envía `null` para
// los campos vacíos (`email: emailValue || null`), y un input en blanco llega
// como cadena vacía; ambos casos deben tratarse como "no provisto" (no como un
// valor inválido). `v == null` cubre `null` y `undefined`.
const blankToUndefined = (v: unknown) =>
  v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v;

// Correo opcional: si viene vacío se ignora; si viene, se normaliza (trim +
// minúsculas) y valida formato. Normalizar mantiene consistencia entre
// clients/profiles/Auth y evita que variantes de mayúsculas evadan los chequeos
// de "correo ya en uso" y de unicidad de Supabase Auth.
const optionalEmail = z.preprocess(
  blankToUndefined,
  z.string().trim().toLowerCase().email('Email inválido').optional()
);

// Teléfono opcional: si viene vacío se ignora; si viene, normaliza a E.164.
const optionalPhoneE164 = z.preprocess(blankToUndefined, phoneE164.optional());

export const createClientSchema = z
  .object({
    name: z.string().min(1, 'Nombre es requerido').max(200),
    email: optionalEmail,
    phone: optionalPhoneE164,
    cedula: z.string().max(30).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
  })
  // Regla de negocio: debe haber al menos uno de correo o teléfono. La cuenta
  // de Supabase Auth se crea solo cuando hay correo (lo decide la ruta API).
  .refine((data) => !!data.email || !!data.phone, {
    message: 'Debe indicar al menos un correo electrónico o un teléfono',
    path: ['email'],
  });

export type CreateClientInput = z.infer<typeof createClientSchema>;

// El esquema de actualización NO exige "al menos uno" porque es una
// actualización parcial: los campos ausentes conservan su valor actual. El
// invariante (no quedar sin correo y sin teléfono a la vez) lo garantiza el
// CHECK `clients_email_or_phone_present` en la base de datos (migración 013).
export const updateClientSchema = z.object({
  clientId: z.string().uuid('ID de cliente inválido'),
  name: z.string().min(1).max(200).optional(),
  email: optionalEmail,
  phone: optionalPhoneE164,
  cedula: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

export type UpdateClientInput = z.infer<typeof updateClientSchema>;
