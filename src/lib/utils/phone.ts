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
 */

/** Strict E.164: starts with `+`, country code 1-9, total digits 10-15. */
export const E164_REGEX = /^\+[1-9]\d{9,14}$/;

/**
 * Default country code applied when the operator types a local-format
 * phone (e.g. `0424-926-3556` or `4249263556`). Bordados Perrino is
 * Venezuela-based, hence `58`. Change here if the business expands.
 */
export const DEFAULT_COUNTRY_CODE = '58';

/**
 * Normalize a user-typed phone string toward E.164.
 *
 * Accepts the formats an admin is likely to type:
 * - Already E.164 (`+584249263556`) — kept as-is.
 * - International prefix without `+` (`584249263556`) — `+` added.
 * - International dial prefix `00` (`00584249263556`) — `00` → `+`.
 * - Local with trunk zero (`04249263556`) — strips the `0` and
 *   prepends the default country code → `+584249263556`.
 * - Local without trunk zero (`4249263556`) — prepends the default
 *   country code → `+584249263556`. Triggered when the input has
 *   exactly 10 digits, the most common national-significant length.
 *
 * Common separators (spaces, dashes, parentheses, dots, underscores)
 * are stripped first so the rules above operate on digit-only input.
 *
 * @param raw user-provided phone string
 * @param defaultCountryCode digits-only country code (no `+`); falls
 *        back to `DEFAULT_COUNTRY_CODE` if not supplied
 * @returns the cleaned, `+`-prefixed candidate (NOT guaranteed valid —
 *          call `isE164()` to verify)
 */
export function normalizePhone(
  raw: string,
  defaultCountryCode: string = DEFAULT_COUNTRY_CODE
): string {
  // 1. Strip whitespace, dashes, parentheses, dots, underscores.
  let s = raw.trim().replace(/[\s\-(). _]/g, '');

  // 2. International dial prefix `00` → `+`.
  if (s.startsWith('00')) s = '+' + s.slice(2);

  // 3. Already E.164 — done.
  if (s.startsWith('+')) return s;

  // 4. Local with trunk `0` (Venezuelan/Argentinian/etc style):
  //    `04249263556` (11 digits) → strip the `0` → `4249263556`.
  if (s.startsWith('0')) s = s.slice(1);

  // 5. National-significant length (10 digits) → prepend default country
  //    code. Covers the most common case where the operator types just
  //    the local number without country prefix.
  if (s.length === 10) {
    return '+' + defaultCountryCode + s;
  }

  // 6. Anything else → assume the country code is already at the front,
  //    just needs the `+`. (e.g. `5215512345678` for a 13-digit country code.)
  return '+' + s;
}

/** True iff `value` is a strict E.164 phone number. */
export function isE164(value: string): boolean {
  return E164_REGEX.test(value);
}

/**
 * Human-readable error message for admin UIs. Used as the Zod `message`
 * on the phone validator so the form-level error tells the operator
 * what we accept and shows two correct examples.
 */
export const PHONE_E164_ERROR_MESSAGE =
  'Teléfono inválido. Aceptamos: +584249263556, 584249263556, ' +
  '04249263556 (local con 0) o 4249263556 (local). Para otros países, ' +
  'incluí el código país: ej. +584121234567 (Venezuela móvil).';
