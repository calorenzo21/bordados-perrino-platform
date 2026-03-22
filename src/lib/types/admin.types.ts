/**
 * Shared types for admin detail views.
 * No 'use client' directive — importable from both Server Components and client hooks.
 */

export interface OrderForDetail {
  id: string;
  uuid: string;
  client: {
    id: string;
    name: string;
    initials: string;
    email: string;
    phone: string;
    cedula: string;
    address: string;
  };
  description: string;
  serviceType: string;
  quantity: number;
  total: number;
  status: string;
  dueDate: string;
  createdAt: string;
  isDelayed: boolean;
  daysRemaining: number;
  isUrgent: boolean;
  statusHistory: {
    id: string;
    status: string;
    date: string;
    time: string;
    observations: string;
    photos: string[];
    user: string;
    quantityDelivered?: number | null;
  }[];
  payments: {
    id: string;
    amount: number;
    date: string;
    time: string;
    method: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
    notes: string;
    photos: string[];
    user: string;
  }[];
}

export interface ClientDetail {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  cedula: string;
  address: string;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  createdAt: string;
  notes: string;
  orders: {
    id: string;
    description: string;
    serviceType: string;
    status: string;
    total: number;
    quantity: number;
    date: string;
    dueDate: string;
  }[];
}
