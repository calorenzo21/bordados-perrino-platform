import { getExpensesData } from '@/lib/services/expenses.server';

import { ExpensesContent } from './_components/ExpensesContent';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const { expenses, expenseTypes } = await getExpensesData();

  return <ExpensesContent initialExpenses={expenses} initialExpenseTypes={expenseTypes} />;
}
