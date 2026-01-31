/**
 * Clients Repository
 * 
 * Data access layer for clients table.
 * All database operations for clients should go through this repository.
 */

import { SupabaseClient } from '@supabase/supabase-js';

import type {
  Client,
  ClientInsert,
  ClientUpdate,
  ClientWithStats,
  ClientFilters,
  PaginatedResponse,
} from '@/lib/types/database';

export class ClientsRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all clients with their statistics
   */
  async findAll(): Promise<ClientWithStats[]> {
    const { data, error } = await this.supabase
      .from('clients_with_stats')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Get clients with pagination and filters
   */
  async findPaginated(
    page: number = 1,
    pageSize: number = 10,
    filters?: ClientFilters
  ): Promise<PaginatedResponse<ClientWithStats>> {
    let query = this.supabase
      .from('clients_with_stats')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      );
    }

    if (filters?.hasActiveOrders) {
      query = query.gt('active_orders', 0);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  /**
   * Get a single client by ID
   */
  async findById(id: string): Promise<ClientWithStats | null> {
    const { data, error } = await this.supabase
      .from('clients_with_stats')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Get a client by user_id (for client portal)
   */
  async findByUserId(userId: string): Promise<Client | null> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Get a client by email
   */
  async findByEmail(email: string): Promise<Client | null> {
    const { data, error } = await this.supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Create a new client
   */
  async create(client: ClientInsert): Promise<Client> {
    const { data, error } = await this.supabase
      .from('clients')
      .insert(client)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Update a client
   */
  async update(id: string, updates: ClientUpdate): Promise<Client> {
    const { data, error } = await this.supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Delete a client
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  /**
   * Link a client to a user account
   */
  async linkToUser(clientId: string, userId: string): Promise<Client> {
    return this.update(clientId, { user_id: userId });
  }

  /**
   * Get total count of clients
   */
  async count(): Promise<number> {
    const { count, error } = await this.supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    if (error) throw new Error(error.message);
    return count || 0;
  }
}
