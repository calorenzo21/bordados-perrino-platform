/**
 * Mapea el color de expense_types (BD) a clases Tailwind para badges.
 * Soporta variantes 500 y 600 (ej. bg-pink-500, bg-green-600).
 */
const COLOR_TO_BADGE: Record<string, string> = {
  'bg-blue-500': 'bg-blue-100 text-blue-700 border-blue-200',
  'bg-blue-600': 'bg-blue-100 text-blue-700 border-blue-200',
  'bg-amber-500': 'bg-amber-100 text-amber-700 border-amber-200',
  'bg-amber-600': 'bg-amber-100 text-amber-700 border-amber-200',
  'bg-pink-500': 'bg-pink-100 text-pink-700 border-pink-200',
  'bg-pink-600': 'bg-pink-100 text-pink-700 border-pink-200',
  'bg-purple-500': 'bg-purple-100 text-purple-700 border-purple-200',
  'bg-purple-600': 'bg-purple-100 text-purple-700 border-purple-200',
  'bg-emerald-500': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-emerald-600': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-rose-500': 'bg-rose-100 text-rose-700 border-rose-200',
  'bg-rose-600': 'bg-rose-100 text-rose-700 border-rose-200',
  'bg-fuchsia-500': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'bg-fuchsia-600': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  'bg-violet-500': 'bg-violet-100 text-violet-700 border-violet-200',
  'bg-violet-600': 'bg-violet-100 text-violet-700 border-violet-200',
  'bg-indigo-500': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-indigo-600': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-cyan-500': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-cyan-600': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-teal-500': 'bg-teal-100 text-teal-700 border-teal-200',
  'bg-teal-600': 'bg-teal-100 text-teal-700 border-teal-200',
  'bg-green-500': 'bg-green-100 text-green-700 border-green-200',
  'bg-green-600': 'bg-green-100 text-green-700 border-green-200',
  'bg-lime-500': 'bg-lime-100 text-lime-700 border-lime-200',
  'bg-lime-600': 'bg-lime-100 text-lime-700 border-lime-200',
  'bg-yellow-500': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-yellow-600': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-orange-500': 'bg-orange-100 text-orange-700 border-orange-200',
  'bg-orange-600': 'bg-orange-100 text-orange-700 border-orange-200',
  'bg-red-500': 'bg-red-100 text-red-700 border-red-200',
  'bg-red-600': 'bg-red-100 text-red-700 border-red-200',
};

export function expenseTypeColorToBadgeClasses(color: string): string {
  return COLOR_TO_BADGE[color] || 'bg-slate-100 text-slate-700 border-slate-200';
}
