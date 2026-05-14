/**
 * Phone normalization to E.164 — the format the bordados-perrino-agent
 * uses when matching incoming WhatsApp numbers against `clients.phone`.
 *
 * Why this matters
 * ----------------
 * WhatsApp Cloud API delivers the customer's number in `wa_id` as digits
 * only (e.g. "584249263556"). The agent prepends `+` and queries the
 * platform with E.164 (`+584249263556`). The lookup against
 * `clients.phone` is **string-exact** — any deviation (missing `+`, extra
 * dashes/spaces, leading zero) means the customer's message never lands
 * on their orders. So every phone WRITTEN to `clients.phone` must already
 * be in E.164 form.
 *
 * Canonical format
 * ----------------
 * `+<country_code><number>` — 10 to 15 digits total after the `+`, no
 * separators. The country code never starts with `0` per ITU-T E.164.
 *
 * Examples:
 * - `+584249263556` (Venezuela mobile)
 * - `+5215512345678` (Mexico mobile, note the `1` after `+52`)
 * - `+5491155123456` (Argentina mobile, note the `9` after `+54`)
 */

/** Strict E.164: starts with `+`, country code 1-9, total digits 10-15. */
export const E164_REGEX = /^\+[1-9]\d{9,14}$/;

/**
 * Normalize a user-typed phone string toward E.164.
 *
 * Accepts common formatting (spaces, dashes, dots, parentheses) and the
 * `00` international dial prefix (replaces with `+`). Does NOT guess the
 * country code — if the input lacks one, the result will fail validation
 * and the admin must re-enter the number with the country code.
 *
 * @param raw user-provided phone string
 * @returns the cleaned, `+`-prefixed candidate (NOT guaranteed valid —
 *          call `isE164()` to verify)
 */
export function normalizePhone(raw: string): string {
  // Strip whitespace, dashes, parentheses, dots, underscores.
  let s = raw.trim().replace(/[\s\-(). _]/g, '');
  // "00" international dial prefix → "+".
  if (s.startsWith('00')) s = '+' + s.slice(2);
  // Add leading `+` if missing.
  if (!s.startsWith('+')) s = '+' + s;
  return s;
}

/** True iff `value` is a strict E.164 phone number. */
export function isE164(value: string): boolean {
  return E164_REGEX.test(value);
}

/**
 * Human-readable error message for admin UIs. Used as the Zod `message`
 * on the phone validator so the form-level error tells the operator
 * exactly which format is required + examples by country.
 */
export const PHONE_E164_ERROR_MESSAGE =
  'Teléfono inválido. Usá formato E.164 con código país. ' +
  'Ej: +584249263556 (Venezuela), +5215512345678 (México móvil con el 1).';
