'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useClientPanel } from '@/hooks/useClientPanel';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ListFilter,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';

import { OrderStatus, OrderStatusLabels, type OrderStatusType } from '@/lib/utils/status';

import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

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

// Status filter options with icons and colors
const statusFilterOptions = [
  {
    value: 'all',
    label: 'Todos',
    icon: ListFilter,
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    dotColor: 'bg-slate-400',
  },
  {
    value: OrderStatus.RECIBIDO,
    label: OrderStatusLabels[OrderStatus.RECIBIDO],
    icon: Package,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    dotColor: 'bg-blue-500',
  },
  {
    value: OrderStatus.CONFECCION,
    label: OrderStatusLabels[OrderStatus.CONFECCION],
    icon: Clock,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    dotColor: 'bg-amber-500',
  },
  {
    value: OrderStatus.RETIRO,
    label: OrderStatusLabels[OrderStatus.RETIRO],
    icon: Truck,
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    dotColor: 'bg-emerald-500',
  },
  {
    value: OrderStatus.PARCIALMENTE_ENTREGADO,
    label: OrderStatusLabels[OrderStatus.PARCIALMENTE_ENTREGADO],
    icon: PackageCheck,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    dotColor: 'bg-purple-500',
  },
  {
    value: OrderStatus.ENTREGADO,
    label: OrderStatusLabels[OrderStatus.ENTREGADO],
    icon: CheckCircle2,
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-600',
    dotColor: 'bg-sky-500',
  },
  {
    value: OrderStatus.CANCELADO,
    label: OrderStatusLabels[OrderStatus.CANCELADO],
    icon: XCircle,
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-600',
    dotColor: 'bg-rose-500',
  },
];

export function PanelContent() {
  const router = useRouter();
  const { data, isLoading, isValidating, error } = useClientPanel();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get orders from data (or empty array if no data yet)
  const orders = data?.orders ?? [];
  const profile = data?.profile;

  // Filter and sort orders - must be called before any early returns
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.description.toLowerCase().includes(query) ||
          order.orderNumber.toLowerCase().includes(query) ||
          order.serviceType.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Sort orders: active first (by urgency, then date), then completed
    return filtered.sort((a, b) => {
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
  }, [orders, searchQuery, statusFilter]);

  // Count active orders - must be called before any early returns
  const activeStatuses: OrderStatusType[] = [
    OrderStatus.RECIBIDO,
    OrderStatus.CONFECCION,
    OrderStatus.RETIRO,
    OrderStatus.PARCIALMENTE_ENTREGADO,
  ];
  const activeOrdersCount = useMemo(
    () => orders.filter((o) => activeStatuses.includes(o.status as OrderStatusType)).length,
    [orders]
  );

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
  if (!data || !profile) {
    return <PanelSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Header Card - Blue gradient */}
      <div className="rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 p-6 shadow-lg shadow-blue-200/50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white">Hola, {profile.name}</h1>
              {isValidating && <RefreshCw className="h-4 w-4 text-white/60 animate-spin" />}
            </div>
            <p className="text-sm text-blue-100 mt-1">
              {activeOrdersCount > 0
                ? `${activeOrdersCount} pedido${activeOrdersCount !== 1 ? 's' : ''} en proceso`
                : 'No tienes pedidos activos'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{orders.length}</p>
            <p className="text-xs text-blue-100">pedidos totales</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar pedido..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm h-10 pl-10 rounded-xl border-slate-200 bg-white/80 backdrop-blur-sm focus:border-blue-300 focus:ring-blue-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-11 h-10 rounded-xl border-slate-200 bg-white/80 backdrop-blur-sm px-0 justify-center [&>svg:last-child]:hidden">
            {(() => {
              const selectedOption = statusFilterOptions.find((o) => o.value === statusFilter);
              const Icon = selectedOption?.icon || ListFilter;
              const isFiltered = statusFilter !== 'all';
              return (
                <div className="relative">
                  <Icon
                    className={`h-4 w-4 ${isFiltered ? selectedOption?.textColor : 'text-slate-500'}`}
                  />
                  {isFiltered && (
                    <span
                      className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${selectedOption?.dotColor}`}
                    />
                  )}
                </div>
              );
            })()}
          </SelectTrigger>
          <SelectContent className="rounded-xl w-56">
            {statusFilterOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = statusFilter === option.value;
              return (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="rounded-lg cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center h-7 w-7 rounded-lg ${option.bgColor}`}
                    >
                      <Icon className={`h-4 w-4 ${option.textColor}`} />
                    </div>
                    <span className={isSelected ? 'font-medium' : ''}>{option.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Orders count indicator */}
      {(searchQuery || statusFilter !== 'all') && (
        <p className="text-sm text-slate-500">
          Mostrando {filteredAndSortedOrders.length} de {orders.length} pedidos
        </p>
      )}

      {/* Lista de pedidos - protagonista */}
      <div className="space-y-3">
        {filteredAndSortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/50 py-16 text-center shadow-sm">
            <div className="rounded-full bg-slate-100 p-4">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">
              {searchQuery || statusFilter !== 'all'
                ? 'No se encontraron pedidos'
                : 'No tienes pedidos aún'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Intenta con otros filtros'
                : 'Cuando realices un pedido, aparecerá aquí'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          filteredAndSortedOrders.map((order) => {
            const progress = order.total > 0 ? (order.totalPaid / order.total) * 100 : 0;
            const isPaid = order.remainingBalance <= 0;
            const isCompleted = order.status === OrderStatus.ENTREGADO;
            const isCancelled = order.status === OrderStatus.CANCELADO;
            const daysInfo = getDaysIndicator(order);

            return (
              <Link key={order.id} href={`/client/orders/${order.orderNumber}`} className="block">
                <div
                  className={`group relative rounded-2xl bg-white/80 backdrop-blur-sm border transition-all duration-200 hover:shadow-lg hover:border-blue-200/50 active:scale-[0.98] active:shadow-md ${
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
    <div className="space-y-5 animate-pulse">
      {/* Header Card skeleton */}
      <div className="rounded-2xl bg-blue-500 p-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-white/20" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-32 rounded bg-white/20" />
            <div className="h-4 w-40 rounded bg-white/20" />
          </div>
          <div className="text-right space-y-1">
            <div className="h-8 w-12 rounded bg-white/20" />
            <div className="h-3 w-16 rounded bg-white/20" />
          </div>
        </div>
      </div>

      {/* Search and Filter skeleton */}
      <div className="flex flex-row gap-2">
        <div className="h-10 flex-1 rounded-xl bg-slate-200" />
        <div className="h-10 w-11 rounded-xl bg-slate-200" />
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
