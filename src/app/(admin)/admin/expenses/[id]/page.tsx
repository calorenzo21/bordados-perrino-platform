import { getAdminExpenseDetail } from '@/lib/services/expenses.server';

import { ExpenseDetailClient } from './_components/ExpenseDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0;

export default async function ExpenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getAdminExpenseDetail(id);
  return (
    <ExpenseDetailClient
      expenseId={id}
      initialExpense={data?.expense ?? null}
      initialExpenseTypes={data?.expenseTypes ?? []}
    />
  );
}
