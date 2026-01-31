'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/browser';

// Tipos que coinciden con la interfaz existente
interface ExpenseType {
  id: string;
  name: string;
  color: string;
  isCustom: boolean;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  typeId: string;
  typeName: string;
  typeColor: string;
  date: string;
  createdAt: string;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  // Crear cliente una sola vez
  const supabase = useMemo(() => createClient(), []);

  const fetchExpenses = useCallback(async () => {
    if (!isMounted.current) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Verificar que hay sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!hasFetched.current) {
          setTimeout(() => {
            if (isMounted.current) fetchExpenses();
          }, 500);
        }
        return;
      }

      // Obtener tipos de gastos
      const { data: typesData, error: typesError } = await supabase
        .from('expense_types')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });

      if (typesError) throw typesError;

      hasFetched.current = true;

      if (isMounted.current) {
        setExpenseTypes((typesData || []).map(t => ({
          id: t.id,
          name: t.name,
          color: t.color,
          isCustom: !t.is_system,
        })));
      }

      // Obtener gastos
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_types (name, color)
        `)
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;

      if (isMounted.current) {
        setExpenses((expensesData || []).map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          typeId: e.expense_type_id,
          typeName: e.expense_types?.name || '',
          typeColor: e.expense_types?.color || 'bg-slate-500',
          date: e.date,
          createdAt: e.created_at?.split('T')[0] || '',
        })));
      }

    } catch (err) {
      console.error('Error fetching expenses:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar gastos');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    isMounted.current = true;
    hasFetched.current = false;
    fetchExpenses();

    return () => {
      isMounted.current = false;
    };
  }, [fetchExpenses]);

  return { expenses, expenseTypes, isLoading, error, refetch: fetchExpenses };
}

export function useExpense(expenseId: string) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchExpense = useCallback(async () => {
    if (!expenseId || !isMounted.current) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!hasFetched.current) {
          setTimeout(() => {
            if (isMounted.current) fetchExpense();
          }, 500);
        }
        return;
      }

      // Obtener tipos de gastos
      const { data: typesData } = await supabase
        .from('expense_types')
        .select('*')
        .order('name', { ascending: true });

      hasFetched.current = true;

      if (isMounted.current) {
        setExpenseTypes((typesData || []).map(t => ({
          id: t.id,
          name: t.name,
          color: t.color,
          isCustom: !t.is_system,
        })));
      }

      // Obtener gasto
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select(`
          *,
          expense_types (name, color)
        `)
        .eq('id', expenseId)
        .single();

      if (expenseError) throw expenseError;

      if (isMounted.current) {
        setExpense({
          id: expenseData.id,
          description: expenseData.description,
          amount: expenseData.amount,
          typeId: expenseData.expense_type_id,
          typeName: expenseData.expense_types?.name || '',
          typeColor: expenseData.expense_types?.color || 'bg-slate-500',
          date: expenseData.date,
          createdAt: expenseData.created_at?.split('T')[0] || '',
        });
      }

    } catch (err) {
      console.error('Error fetching expense:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar gasto');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [expenseId, supabase]);

  useEffect(() => {
    isMounted.current = true;
    hasFetched.current = false;
    fetchExpense();

    return () => {
      isMounted.current = false;
    };
  }, [fetchExpense]);

  return { expense, expenseTypes, isLoading, error, refetch: fetchExpense };
}
