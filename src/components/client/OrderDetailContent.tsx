'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useClientOrder } from '@/hooks/useClientOrder';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  PackageCheck,
  RefreshCw,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react';

import type { ClientOrderDetail } from '@/lib/services/client-portal.server';
import { OrderStatus, OrderStatusLabels, type OrderStatusType } from '@/lib/utils/status';

import { ImageGallery } from '@/components/client/ImageGallery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Payment methods
const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'transferencia', label: 'Transferencia', icon: Wallet },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'otro', label: 'Otro', icon: DollarSign },
] as const;

// Status flow
const statusFlow: OrderStatusType[] = [
  OrderStatus.RECIBIDO,
  OrderStatus.CONFECCION,
  OrderStatus.RETIRO,
  OrderStatus.PARCIALMENTE_ENTREGADO,
  OrderStatus.ENTREGADO,
];

const statusIcons = {
  [OrderStatus.RECIBIDO]: Package,
  [OrderStatus.CONFECCION]: Clock,
  [OrderStatus.RETIRO]: Truck,
  [OrderStatus.PARCIALMENTE_ENTREGADO]: PackageCheck,
  [OrderStatus.ENTREGADO]: CheckCircle2,
  [OrderStatus.CANCELADO]: XCircle,
};

const statusColors = {
  [OrderStatus.RECIBIDO]: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-100',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-blue-600',
  },
  [OrderStatus.CONFECCION]: {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-100',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    gradient: 'from-amber-500 to-amber-600',
  },
  [OrderStatus.RETIRO]: {
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-100',
    light: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  [OrderStatus.PARCIALMENTE_ENTREGADO]: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-100',
    light: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    gradient: 'from-purple-500 to-purple-600',
  },
  [OrderStatus.ENTREGADO]: {
    bg: 'bg-sky-500',
    bgLight: 'bg-sky-100',
    light: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200',
    gradient: 'from-sky-500 to-sky-600',
  },
  [OrderStatus.CANCELADO]: {
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-100',
    light: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    gradient: 'from-rose-500 to-rose-600',
  },
};

const segmentColors = ['bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface OrderDetailContentProps {
  orderId: string;
  initialData?: ClientOrderDetail;
}

export function OrderDetailContent({ orderId, initialData }: OrderDetailContentProps) {
  const router = useRouter();
  const { order, isLoading, isValidating, error } = useClientOrder(orderId, {
    fallbackData: initialData,
  });

  // Use the order from SWR (which falls back to initialData)
  const displayOrder = order || initialData;

  // Loading state - only show on first load when no cached data
  if (isLoading && !displayOrder) {
    return <OrderDetailSkeleton />;
  }

  // Handle error state
  if (error && !displayOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <XCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-lg font-medium text-slate-900">Error al cargar el pedido</h2>
        <p className="text-sm text-slate-500 mt-1">{error.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/client/panel')}>
          Volver al panel
        </Button>
      </div>
    );
  }

  // Safety check - should not happen after above checks
  if (!displayOrder) {
    return <OrderDetailSkeleton />;
  }

  // Calculate payment progress
  const paymentProgress =
    displayOrder.total > 0 ? (displayOrder.totalPaid / displayOrder.total) * 100 : 0;
  const isPaid = displayOrder.remainingBalance <= 0;

  // Dynamic status flow
  const partialDeliveryCount = displayOrder.statusHistory.filter(
    (h) => h.status === OrderStatus.PARCIALMENTE_ENTREGADO
  ).length;
  const showPartialDeliveryInTimeline =
    displayOrder.status === OrderStatus.PARCIALMENTE_ENTREGADO ||
    partialDeliveryCount > 0 ||
    (displayOrder.status !== OrderStatus.ENTREGADO &&
      displayOrder.status !== OrderStatus.CANCELADO);

  const dynamicStatusFlow: OrderStatusType[] = showPartialDeliveryInTimeline
    ? statusFlow
    : statusFlow.filter((s) => s !== OrderStatus.PARCIALMENTE_ENTREGADO);

  const dynamicSegmentColors = showPartialDeliveryInTimeline
    ? segmentColors
    : segmentColors.filter((_, i) => i !== 3);

  const currentStatusIndex = dynamicStatusFlow.indexOf(displayOrder.status as OrderStatusType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/client/panel">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl backdrop-blur-sm bg-white/50 border border-slate-200/50 hover:bg-white/80 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{displayOrder.orderNumber}</h1>
            <Badge
              className={`${statusColors[displayOrder.status as OrderStatusType].light} ${statusColors[displayOrder.status as OrderStatusType].text} ${statusColors[displayOrder.status as OrderStatusType].border} border`}
            >
              {OrderStatusLabels[displayOrder.status as OrderStatusType]}
            </Badge>
            {displayOrder.isUrgent && (
              <Badge className="bg-rose-500/10 text-rose-600 border-rose-200/50">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Urgente
              </Badge>
            )}
            {isValidating && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{displayOrder.description}</p>
        </div>
      </div>

      {/* Timeline */}
      {displayOrder.status !== OrderStatus.CANCELADO && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/50 p-6 shadow-sm overflow-x-auto">
          <TooltipProvider delayDuration={100}>
            <div className="relative min-w-[400px]">
              {/* Progress segments with gaps */}
              <div className="absolute top-7 left-7 right-7 flex gap-1">
                {dynamicStatusFlow.slice(0, -1).map((_, index) => {
                  const isCompleted = index < currentStatusIndex;
                  return (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                        isCompleted ? dynamicSegmentColors[index] : 'bg-slate-200'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Status steps */}
              <div className="relative flex justify-between">
                {dynamicStatusFlow.map((status, index) => {
                  const Icon = statusIcons[status];
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const colors = statusColors[status];
                  const isEntregadoFinal = status === OrderStatus.ENTREGADO && isCurrent;
                  const showAsCompleted = (isCompleted && !isCurrent) || isEntregadoFinal;
                  const historyItem = displayOrder.statusHistory.find((h) => h.status === status);

                  return (
                    <Tooltip key={status}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center cursor-pointer">
                          <div
                            className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ${
                              showAsCompleted
                                ? `bg-linear-to-br ${colors.gradient} shadow-lg`
                                : isCurrent
                                  ? `${colors.bgLight} border-2 ${colors.border}`
                                  : 'border-2 border-slate-200 bg-white'
                            }`}
                          >
                            {showAsCompleted ? (
                              <Check className="h-6 w-6 text-white" />
                            ) : (
                              <Icon
                                className={`h-6 w-6 ${isCurrent ? colors.text : 'text-slate-300'}`}
                              />
                            )}
                            {isCurrent && !isEntregadoFinal && (
                              <span
                                className={`absolute inset-0 animate-ping rounded-full ${colors.bgLight} opacity-50`}
                              />
                            )}
                          </div>
                          <div className="mt-3 text-center hidden sm:block">
                            <p
                              className={`text-xs font-medium ${isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'}`}
                            >
                              {OrderStatusLabels[status]}
                            </p>
                            {historyItem && (
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {formatDate(historyItem.changedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-center">
                        <p className="font-medium">{OrderStatusLabels[status]}</p>
                        {historyItem && (
                          <p className="text-xs text-muted-foreground">
                            {formatDate(historyItem.changedAt)}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Payment summary */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/50 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isPaid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500" />
            )}
            <span className="font-medium text-slate-900">
              ${displayOrder.totalPaid.toLocaleString()}
              <span className="text-slate-400 font-normal">
                {' '}
                / ${displayOrder.total.toLocaleString()}
              </span>
            </span>
          </div>
          <span
            className={`text-sm font-semibold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}
          >
            {isPaid
              ? 'Pagado completamente'
              : `$${displayOrder.remainingBalance.toLocaleString()} pendiente`}
          </span>
        </div>
        <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
              isPaid
                ? 'bg-linear-to-r from-emerald-400 to-emerald-500'
                : 'bg-linear-to-r from-blue-400 to-blue-500'
            }`}
            style={{ width: `${Math.min(paymentProgress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Entrega: {formatDate(displayOrder.dueDate)}
          </span>
          <span>
            {displayOrder.serviceType} • {displayOrder.quantity} unidades
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100/80 backdrop-blur-sm p-1">
          <TabsTrigger
            value="history"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <Clock className="mr-1.5 h-4 w-4" />
            Historial ({displayOrder.statusHistory.length})
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <DollarSign className="mr-1.5 h-4 w-4" />
            Abonos ({displayOrder.payments.length})
          </TabsTrigger>
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-sm">
            <CardContent className="p-5">
              {displayOrder.statusHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-slate-100 p-3">
                    <Clock className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Sin historial de cambios</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

                  <div className="space-y-6">
                    {displayOrder.statusHistory.map((item) => {
                      const colors = statusColors[item.status as OrderStatusType];
                      const Icon = statusIcons[item.status as OrderStatusType];

                      return (
                        <div key={item.id} className="relative pl-14">
                          <div
                            className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br ${colors.gradient} shadow-md`}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>

                          <div className={`rounded-xl border ${colors.border} ${colors.light} p-4`}>
                            <div className="flex items-center justify-between gap-2">
                              <Badge className={`${colors.bg} border-0 text-white`}>
                                {OrderStatusLabels[item.status as OrderStatusType]}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {formatDate(item.changedAt)} • {formatTime(item.changedAt)}
                              </span>
                            </div>

                            {item.observations && (
                              <div className="mt-3">
                                <p className="text-xs font-medium uppercase text-slate-400">
                                  Observaciones
                                </p>
                                <p className="mt-1 text-sm text-slate-700">{item.observations}</p>
                              </div>
                            )}

                            {item.changedBy && (
                              <p className="mt-2 text-xs text-slate-400">
                                Actualizado por {item.changedBy}
                              </p>
                            )}

                            {item.photos && item.photos.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium uppercase text-slate-400 mb-2">
                                  Fotos
                                </p>
                                <ImageGallery photos={item.photos} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <Card className="rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-sm">
            <CardContent className="p-5">
              {displayOrder.payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-slate-100 p-3">
                    <Banknote className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Aún no hay abonos registrados</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-emerald-200" />

                  <div className="space-y-4">
                    {displayOrder.payments.map((payment) => {
                      const PaymentIcon =
                        paymentMethods.find((m) => m.id === payment.method)?.icon || DollarSign;

                      return (
                        <div key={payment.id} className="relative pl-14">
                          <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-500 shadow-md">
                            <PaymentIcon className="h-5 w-5 text-white" />
                          </div>

                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-lg font-semibold text-emerald-600">
                                ${payment.amount.toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatDate(payment.paymentDate)} •{' '}
                                {formatTime(payment.paymentDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-xs border-emerald-200 text-emerald-700"
                              >
                                {paymentMethods.find((m) => m.id === payment.method)?.label ||
                                  'Otro'}
                              </Badge>
                              {payment.receivedBy && (
                                <span className="text-xs text-slate-400">
                                  por {payment.receivedBy}
                                </span>
                              )}
                            </div>
                            {payment.notes && (
                              <p className="mt-2 text-sm text-slate-600">{payment.notes}</p>
                            )}
                            {payment.photos && payment.photos.length > 0 && (
                              <div className="mt-2">
                                <ImageGallery photos={payment.photos} thumbnailSize="sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Skeleton component for loading state
function OrderDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-24 rounded bg-slate-200" />
            <div className="h-5 w-20 rounded-full bg-slate-200" />
          </div>
          <div className="h-4 w-48 rounded bg-slate-200" />
        </div>
      </div>

      {/* Timeline skeleton */}
      <div className="rounded-2xl bg-white/80 border border-slate-200/50 p-6">
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="h-14 w-14 rounded-full bg-slate-200" />
              <div className="mt-3 h-3 w-16 rounded bg-slate-200 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>

      {/* Payment summary skeleton */}
      <div className="rounded-2xl bg-white/80 border border-slate-200/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="h-5 w-28 rounded bg-slate-200" />
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-200" />
        <div className="flex items-center justify-between mt-3">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="h-4 w-28 rounded bg-slate-200" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="h-10 w-full rounded-xl bg-slate-200" />
        <div className="rounded-2xl bg-white/80 border border-slate-200/50 p-5">
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-20 rounded bg-slate-200" />
                  <div className="h-4 w-full rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
