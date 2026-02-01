import { getExpensesData } from '@/lib/services/expenses.server';

import { ExpensesContent } from './_components/ExpensesContent';

// Revalidar cada 5 minutos como fallback.
// La invalidación principal ocurre via revalidatePath() cuando hay cambios.
export const revalidate = 300;

export default async function ExpensesPage() {
  const { expenses, expenseTypes } = await getExpensesData();

  return <ExpensesContent initialExpenses={expenses} initialExpenseTypes={expenseTypes} />;
}
