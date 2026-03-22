import { getExpensesData } from '@/lib/services/expenses.server';

import { NewExpenseClient } from './_components/NewExpenseClient';

export const revalidate = 0;

export default async function NewExpensePage() {
  const { expenseTypes } = await getExpensesData();
  return <NewExpenseClient initialExpenseTypes={expenseTypes} />;
}
