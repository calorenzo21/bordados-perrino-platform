import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escape special characters for PostgREST ilike queries.
 * Prevents `%` and `_` in user input from acting as wildcards.
 */
export function escapeIlike(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
