/**
 * Expense form validation helpers.
 *
 * Guards the expense `date` field against typos like year "0006" (a real
 * production case: a $10 expense dated 0006-01-20 made the dashboard's
 * monthly totals drift from the all-time total, since month filters never
 * match an out-of-range date but the historic sum counts every row).
 */

/** Earliest date an expense can reasonably carry — anything older is a typo. */
export const EXPENSE_MIN_DATE = '2020-01-01';

/**
 * Today as YYYY-MM-DD in the user's local timezone.
 *
 * NOT `new Date().toISOString()`: that is UTC-today, which in Venezuela
 * (UTC-4) already flips to tomorrow at 8pm local — a form default built from
 * it would then fail the "no future dates" rule.
 */
export function todayISODate(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().split('T')[0];
}

/**
 * Validate an expense date string (YYYY-MM-DD, as emitted by <input type="date">).
 * Returns a user-facing error message, or null when the date is acceptable.
 * ISO date strings compare correctly as plain strings.
 */
export function validateExpenseDate(date: string): string | null {
  if (!date) return 'La fecha es obligatoria';
  if (date < EXPENSE_MIN_DATE) {
    return `La fecha no puede ser anterior a ${EXPENSE_MIN_DATE} — revisa el año`;
  }
  if (date > todayISODate()) {
    return 'La fecha no puede estar en el futuro';
  }
  return null;
}
