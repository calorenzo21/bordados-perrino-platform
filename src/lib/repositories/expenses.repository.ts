/**
 * Expenses Repository
 * 
 * Data access layer for expenses and expense types tables.
 */

import { SupabaseClient } from '@supabase/supabase-js';

import type {
  Expense,
  ExpenseInsert,
  ExpenseUpdate,
  ExpenseWithType,
  ExpenseType,
  ExpenseTypeInsert,
  ExpenseTypeUpdate,
  ExpenseFilters,
  PaginatedResponse,
} from '@/lib/types/database';

// Helper para extraer datos de expense_types que puede venir como objeto o array
function getExpenseTypeData(expenseTypes: unknown): { name: string; color: string } {
  if (!expenseTypes) return { name: '', color: 'bg-slate-500' };
  if (Array.isArray(expenseTypes)) {
    return {
      name: expenseTypes[0]?.name || '',
      color: expenseTypes[0]?.color || 'bg-slate-500',
    };
  }
  const et = expenseTypes as { name?: string; color?: string };
  return {
    name: et.name || '',
    color: et.color || 'bg-slate-500',
  };
}

export class ExpensesRepository {
  constructor(private supabase: SupabaseClient) {}

  // ============================================
  // EXPENSE TYPES
  // ============================================

  /**
   * Get all expense types
   */
  async findAllTypes(): Promise<ExpenseType[]> {
    const { data, error } = await this.supabase
      .from('expense_types')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Get an expense type by ID
   */
  async findTypeById(id: string): Promise<ExpenseType | null> {
    const { data, error } = await this.supabase
      .from('expense_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Create a new expense type
   */
  async createType(type: ExpenseTypeInsert): Promise<ExpenseType> {
    const { data, error } = await this.supabase
      .from('expense_types')
      .insert(type)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Update an expense type
   */
  async updateType(id: string, updates: ExpenseTypeUpdate): Promise<ExpenseType> {
    const { data, error } = await this.supabase
      .from('expense_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Delete an expense type (only custom types)
   */
  async deleteType(id: string): Promise<void> {
    // First check if it's a system type
    const type = await this.findTypeById(id);
    if (type?.is_system) {
      throw new Error('No se pueden eliminar tipos de gasto del sistema');
    }

    const { error } = await this.supabase
      .from('expense_types')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // ============================================
  // EXPENSES
  // ============================================

  /**
   * Get all expenses with type info
   */
  async findAll(): Promise<ExpenseWithType[]> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select(`
        *,
        expense_types (
          name,
          color
        )
      `)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(expense => {
      const typeData = getExpenseTypeData(expense.expense_types);
      return {
        ...expense,
        type_name: typeData.name,
        type_color: typeData.color,
      };
    });
  }

  /**
   * Get expenses with pagination and filters
   */
  async findPaginated(
    page: number = 1,
    pageSize: number = 10,
    filters?: ExpenseFilters
  ): Promise<PaginatedResponse<ExpenseWithType>> {
    let query = this.supabase
      .from('expenses')
      .select(`
        *,
        expense_types (
          name,
          color
        )
      `, { count: 'exact' });

    // Apply filters
    if (filters?.typeId) {
      query = query.eq('expense_type_id', filters.typeId);
    }
    if (filters?.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }
    if (filters?.fromDate) {
      query = query.gte('date', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('date', filters.toDate);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('date', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const expenses = (data || []).map(expense => {
      const typeData = getExpenseTypeData(expense.expense_types);
      return {
        ...expense,
        type_name: typeData.name,
        type_color: typeData.color,
      };
    });

    return {
      data: expenses,
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  /**
   * Get a single expense by ID
   */
  async findById(id: string): Promise<ExpenseWithType | null> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select(`
        *,
        expense_types (
          name,
          color
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    const typeData = getExpenseTypeData(data.expense_types);
    return {
      ...data,
      type_name: typeData.name,
      type_color: typeData.color,
    };
  }

  /**
   * Create a new expense
   */
  async create(expense: ExpenseInsert): Promise<Expense> {
    const { data, error } = await this.supabase
      .from('expenses')
      .insert(expense)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Update an expense
   */
  async update(id: string, updates: ExpenseUpdate): Promise<Expense> {
    const { data, error } = await this.supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Delete an expense
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get monthly expenses total
   */
  async getMonthlyTotal(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('expenses')
      .select('amount')
      .gte('date', startOfMonth.toISOString().split('T')[0]);

    if (error) throw new Error(error.message);
    
    return data?.reduce((sum, e) => sum + e.amount, 0) || 0;
  }

  /**
   * Get total expenses
   */
  async getTotal(): Promise<number> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select('amount');

    if (error) throw new Error(error.message);
    
    return data?.reduce((sum, e) => sum + e.amount, 0) || 0;
  }

  /**
   * Get expenses by type for a period
   */
  async getByTypeForPeriod(
    fromDate: string,
    toDate: string
  ): Promise<{ typeId: string; typeName: string; total: number }[]> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select(`
        expense_type_id,
        amount,
        expense_types (name)
      `)
      .gte('date', fromDate)
      .lte('date', toDate);

    if (error) throw new Error(error.message);

    const byType: Record<string, { typeName: string; total: number }> = {};
    
    data?.forEach(expense => {
      const typeId = expense.expense_type_id;
      if (!byType[typeId]) {
        const typeData = getExpenseTypeData(expense.expense_types);
        byType[typeId] = {
          typeName: typeData.name,
          total: 0,
        };
      }
      byType[typeId].total += expense.amount;
    });

    return Object.entries(byType).map(([typeId, value]) => ({
      typeId,
      ...value,
    }));
  }
}
