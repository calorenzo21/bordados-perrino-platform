'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useClientPanel } from '@/hooks/useClientPanel';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  RefreshCw,
  XCircle,
} from 'lucide-react';

import { OrderStatus, type OrderStatusType } from '@/lib/utils/status';

import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Helper to format date
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Helper to get days indicator
function getDaysIndicator(order: { status: string; isDelayed: boolean; daysRemaining: number }): {
  text: string;
  color: string;
} {
  if (order.status === OrderStatus.ENTREGADO) {
    return { text: 'Completado', color: 'text-emerald-600' };
  }
  if (order.status === OrderStatus.CANCELADO) {
    return { text: 'Cancelado', color: 'text-slate-400' };
  }
  if (order.isDelayed) {
    return { text: `${Math.abs(order.daysRemaining)}d atrasado`, color: 'text-rose-600' };
  }
  if (order.daysRemaining <= 2) {
    return { text: `${order.daysRemaining}d restantes`, color: 'text-amber-600' };
  }
  return { text: `${order.daysRemaining}d restantes`, color: 'text-slate-500' };
}

export function PanelContent() {
  const router = useRouter();
  const { data, isLoading, isValidating, error } = useClientPanel();

  // Loading state - only show on first load when no cached data
  if (isLoading && !data) {
    return <PanelSkeleton />;
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <XCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-lg font-medium text-slate-900">Error al cargar los datos</h2>
        <p className="text-sm text-slate-500 mt-1">{error.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.refresh()}>
          Reintentar
        </Button>
      </div>
    );
  }

  // Should not happen if we get here, but TypeScript safety
  if (!data) {
    return <PanelSkeleton />;
  }

  const { profile, orders } = data;

  // Sort orders: active first (by urgency, then date), then completed
  const sortedOrders = [...orders].sort((a, b) => {
    const activeStatuses: OrderStatusType[] = [
      OrderStatus.RECIBIDO,
      OrderStatus.CONFECCION,
      OrderStatus.RETIRO,
      OrderStatus.PARCIALMENTE_ENTREGADO,
    ];
    const aActive = activeStatuses.includes(a.status as OrderStatusType);
    const bActive = activeStatuses.includes(b.status as OrderStatusType);

    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    if (a.isUrgent && !b.isUrgent) return -1;
    if (!a.isUrgent && b.isUrgent) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-md">
            <AvatarFallback className="bg-linear-to-br from-blue-500 to-blue-600 text-lg font-semibold text-white">
              {profile.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">
                Hola, {profile.name.split(' ')[0]}
              </h1>
              {isValidating && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
            </div>
            <p className="text-sm text-slate-500">
              {orders.length} pedido{orders.length !== 1 ? 's' : ''} en tu cuenta
            </p>
          </div>
        </div>
      </div>

      {/* Lista de pedidos - protagonista */}
      <div className="space-y-3">
        {sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/50 py-16 text-center shadow-sm">
            <div className="rounded-full bg-slate-100 p-4">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">No tienes pedidos aún</p>
            <p className="mt-1 text-sm text-slate-400">Cuando realices un pedido, aparecerá aquí</p>
          </div>
        ) : (
          sortedOrders.map((order) => {
            const progress = order.total > 0 ? (order.totalPaid / order.total) * 100 : 0;
            const isPaid = order.remainingBalance <= 0;
            const isCompleted = order.status === OrderStatus.ENTREGADO;
            const isCancelled = order.status === OrderStatus.CANCELADO;
            const daysInfo = getDaysIndicator(order);

            return (
              <Link key={order.id} href={`/client/orders/${order.orderNumber}`} className="block">
                <div
                  className={`group relative rounded-2xl bg-white/80 backdrop-blur-sm border transition-all duration-300 hover:shadow-lg hover:border-blue-200/50 ${
                    isCancelled
                      ? 'border-slate-200/30 opacity-60'
                      : isCompleted
                        ? 'border-emerald-200/50'
                        : 'border-slate-200/50'
                  }`}
                >
                  <div className="p-5">
                    {/* Header del pedido */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <OrderStatusBadge status={order.status as OrderStatusType} />
                          {order.isUrgent && !isCompleted && !isCancelled && (
                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-200/50 backdrop-blur-sm">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Urgente
                            </Badge>
                          )}
                        </div>
                        <p
                          className={`mt-2 text-sm ${isCancelled ? 'text-slate-400' : 'text-slate-600'} line-clamp-1`}
                        >
                          {order.description}
                        </p>
                      </div>

                      {/* Indicador de días y flecha */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-medium ${daysInfo.color}`}>{daysInfo.text}</p>
                          <p className="text-xs text-slate-400 flex items-center justify-end gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(order.dueDate)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
                      </div>
                    </div>

                    {/* Barra de progreso de pago - prominente */}
                    {!isCancelled && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isPaid ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-slate-700">
                              ${order.totalPaid.toLocaleString()}
                              <span className="text-slate-400 font-normal">
                                {' '}
                                / ${order.total.toLocaleString()}
                              </span>
                            </span>
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              isPaid ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {isPaid
                              ? 'Pagado'
                              : `$${order.remainingBalance.toLocaleString()} pendiente`}
                          </span>
                        </div>

                        {/* Barra de progreso */}
                        <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                              isPaid
                                ? 'bg-linear-to-r from-emerald-400 to-emerald-500'
                                : 'bg-linear-to-r from-blue-400 to-blue-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                          {/* Efecto de brillo */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-white/0 via-white/30 to-white/0"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

// Skeleton component for loading state
function PanelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="h-4 w-24 rounded bg-slate-200" />
        </div>
      </div>

      {/* Orders skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-white/80 border border-slate-200/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-20 rounded-full bg-slate-200" />
                </div>
                <div className="h-4 w-48 rounded bg-slate-200" />
              </div>
              <div className="text-right space-y-1">
                <div className="h-4 w-20 rounded bg-slate-200" />
                <div className="h-3 w-16 rounded bg-slate-200" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-4 w-28 rounded bg-slate-200" />
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
