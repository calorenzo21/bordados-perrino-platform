/**
 * Expenses Server Service
 *
 * Server-side data fetching for expenses.
 * Uses the server Supabase client for SSR.
 *
 * Note: Page-level caching via `revalidate` handles query optimization.
 * unstable_cache cannot be used here because createClient() uses cookies().
 * React.cache() deduplicates within the same request.
 */
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

export interface ExpenseType {
  id: string;
  name: string;
  color: string;
  isCustom: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  typeId: string;
  typeName: string;
  typeColor: string;
  date: string;
  createdAt: string;
}

export interface ExpensesData {
  expenses: Expense[];
  expenseTypes: ExpenseType[];
  lastUpdated: string;
}

/**
 * Fetch all expenses on the server
 * This is called from Server Components
 *
 * Caching is handled at the page level via `revalidate = 60`
 * React.cache() deduplicates calls within the same request
 */
export const getExpensesData = cache(async function getExpensesData(): Promise<ExpensesData> {
  const supabase = await createClient();

  // Fetch types and expenses in parallel
  const [typesResult, expensesResult] = await Promise.all([
    supabase
      .from('expense_types')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true }),
    supabase
      .from('expenses')
      .select(
        `
        *,
        expense_types (name, color)
      `
      )
      .order('date', { ascending: false }),
  ]);

  if (typesResult.error) {
    console.error('Error fetching expense types:', typesResult.error);
    throw new Error('Error al cargar tipos de gastos');
  }

  if (expensesResult.error) {
    console.error('Error fetching expenses:', expensesResult.error);
    throw new Error('Error al cargar gastos');
  }

  const expenseTypes: ExpenseType[] = (typesResult.data || []).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    isCustom: !t.is_system,
  }));

  const expenses: Expense[] = (expensesResult.data || []).map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    typeId: e.expense_type_id,
    typeName: (e.expense_types as { name?: string } | null)?.name || '',
    typeColor: (e.expense_types as { color?: string } | null)?.color || 'bg-slate-500',
    date: e.date,
    createdAt: e.created_at?.split('T')[0] || '',
  }));

  return {
    expenses,
    expenseTypes,
    lastUpdated: new Date().toISOString(),
  };
});
