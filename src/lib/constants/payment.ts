import { Banknote, CreditCard, DollarSign, type LucideIcon, Wallet } from 'lucide-react';

export interface PaymentMethod {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'transferencia', label: 'Transferencia', icon: Wallet },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'otro', label: 'Otro', icon: DollarSign },
] as const;
