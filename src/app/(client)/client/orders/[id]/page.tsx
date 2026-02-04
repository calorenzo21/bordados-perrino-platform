'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  Package,
  PackageCheck,
  Truck,
  Wallet,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/browser';
import { OrderStatus, OrderStatusLabels, type OrderStatusType } from '@/lib/utils/status';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OrderDetail {
  id: string;
  orderNumber: string;
  description: string;
  serviceType: string;
  quantity: number;
  total: number;
  totalPaid: number;
  remainingBalance: number;
  status: string;
  dueDate: string;
  isUrgent: boolean;
  statusHistory: {
    id: string;
    status: string;
    changedAt: string;
    observations: string | null;
    photos: string[];
    changedBy: string | null;
  }[];
  payments: {
    id: string;
    amount: number;
    paymentDate: string;
    method: string;
    notes: string | null;
    photos: string[];
    receivedBy: string | null;
  }[];
}

// Métodos de pago disponibles
const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'transferencia', label: 'Transferencia', icon: Wallet },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'otro', label: 'Otro', icon: DollarSign },
] as const;

// Estados del pedido en orden
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

// Colores de segmento del timeline
const segmentColors = ['bg-blue-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];

// Helper to format date
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Helper to format time
function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function ClientOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Gallery state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const openGallery = (photos: string[], startIndex: number = 0) => {
    setGalleryPhotos(photos);
    setCurrentPhotoIndex(startIndex);
    setIsGalleryOpen(true);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % galleryPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length);
  };

  useEffect(() => {
    async function loadOrder() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Get client
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!client) {
        router.push('/login');
        return;
      }

      const orderId = params.id as string;

      // Check if it's a valid UUID (36 characters with dashes)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderId
      );

      // Try to find by order number or by ID
      let orderQuery = supabase
        .from('orders')
        .select(
          `
          *,
          service_types(name, color)
        `
        )
        .eq('client_id', client.id);

      if (isUUID) {
        orderQuery = orderQuery.eq('id', orderId);
      } else {
        // It's an order number (PED-XXX, ORD-XXX, etc.)
        orderQuery = orderQuery.eq('order_number', orderId);
      }

      const { data: orderData, error: orderError } = await orderQuery.single();

      if (orderError || !orderData) {
        router.push('/client/panel');
        return;
      }

      // Get status history
      const { data: statusHistory } = await supabase
        .from('order_status_history')
        .select('*, profiles(first_name, last_name)')
        .eq('order_id', orderData.id)
        .order('changed_at', { ascending: false });

      // Get payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*, profiles(first_name, last_name)')
        .eq('order_id', orderData.id)
        .order('payment_date', { ascending: false });

      // Calculate totals
      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const remainingBalance = Number(orderData.total) - totalPaid;

      setOrder({
        id: orderData.id,
        orderNumber: orderData.order_number,
        description: orderData.description,
        serviceType: orderData.service_types?.name || 'Sin tipo',
        quantity: orderData.quantity,
        total: Number(orderData.total),
        totalPaid,
        remainingBalance,
        status: orderData.status,
        dueDate: orderData.due_date,
        isUrgent: orderData.is_urgent,
        statusHistory: (statusHistory || []).map((h) => ({
          id: h.id,
          status: h.status,
          changedAt: h.changed_at,
          observations: h.observations,
          photos: h.photos || [],
          changedBy: h.profiles ? `${h.profiles.first_name} ${h.profiles.last_name}` : null,
        })),
        payments: (payments || []).map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentDate: p.payment_date,
          method: p.payment_method,
          notes: p.notes,
          photos: p.receipt_photos || [],
          receivedBy: p.profiles ? `${p.profiles.first_name} ${p.profiles.last_name}` : null,
        })),
      });

      setLoading(false);
    }

    loadOrder();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  // Calcular totales de pagos
  const paymentProgress = order.total > 0 ? (order.totalPaid / order.total) * 100 : 0;
  const isPaid = order.remainingBalance <= 0;

  // Determinar el flujo de estados dinámico
  const partialDeliveryCount = order.statusHistory.filter(
    (h) => h.status === OrderStatus.PARCIALMENTE_ENTREGADO
  ).length;
  const showPartialDeliveryInTimeline =
    order.status === OrderStatus.PARCIALMENTE_ENTREGADO ||
    partialDeliveryCount > 0 ||
    (order.status !== OrderStatus.ENTREGADO && order.status !== OrderStatus.CANCELADO);

  const dynamicStatusFlow: OrderStatusType[] = showPartialDeliveryInTimeline
    ? statusFlow
    : statusFlow.filter((s) => s !== OrderStatus.PARCIALMENTE_ENTREGADO);

  const dynamicSegmentColors = showPartialDeliveryInTimeline
    ? segmentColors
    : segmentColors.filter((_, i) => i !== 3);

  const currentStatusIndex = dynamicStatusFlow.indexOf(order.status as OrderStatusType);

  return (
    <div className="space-y-6">
      {/* Header compacto */}
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
            <h1 className="text-xl font-semibold text-slate-900">{order.orderNumber}</h1>
            <Badge
              className={`${statusColors[order.status as OrderStatusType].light} ${statusColors[order.status as OrderStatusType].text} ${statusColors[order.status as OrderStatusType].border} border`}
            >
              {OrderStatusLabels[order.status as OrderStatusType]}
            </Badge>
            {order.isUrgent && (
              <Badge className="bg-rose-500/10 text-rose-600 border-rose-200/50">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Urgente
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{order.description}</p>
        </div>
      </div>

      {/* Timeline de Progreso - Con segmentos separados y tooltips */}
      {order.status !== OrderStatus.CANCELADO && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/50 p-6 shadow-sm overflow-x-auto">
          <TooltipProvider delayDuration={100}>
            <div className="relative min-w-[400px]">
              {/* Segmentos de progreso con gaps */}
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

              {/* Pasos del progreso */}
              <div className="relative flex justify-between">
                {dynamicStatusFlow.map((status, index) => {
                  const Icon = statusIcons[status];
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const colors = statusColors[status];
                  const isEntregadoFinal = status === OrderStatus.ENTREGADO && isCurrent;
                  const showAsCompleted = (isCompleted && !isCurrent) || isEntregadoFinal;
                  const historyItem = order.statusHistory.find((h) => h.status === status);

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
                          {/* Nombres ocultos en móvil */}
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

      {/* Resumen de pago compacto */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/50 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isPaid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500" />
            )}
            <span className="font-medium text-slate-900">
              ${order.totalPaid.toLocaleString()}
              <span className="text-slate-400 font-normal"> / ${order.total.toLocaleString()}</span>
            </span>
          </div>
          <span
            className={`text-sm font-semibold ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}
          >
            {isPaid
              ? 'Pagado completamente'
              : `$${order.remainingBalance.toLocaleString()} pendiente`}
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
            Entrega: {formatDate(order.dueDate)}
          </span>
          <span>
            {order.serviceType} • {order.quantity} unidades
          </span>
        </div>
      </div>

      {/* Tabs: Historial primero, luego Abonos */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100/80 backdrop-blur-sm p-1">
          <TabsTrigger
            value="history"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <Clock className="mr-1.5 h-4 w-4" />
            Historial ({order.statusHistory.length})
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
          >
            <DollarSign className="mr-1.5 h-4 w-4" />
            Abonos ({order.payments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Historial - Como timeline vertical */}
        <TabsContent value="history" className="mt-4">
          <Card className="rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-sm">
            <CardContent className="p-5">
              {order.statusHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-slate-100 p-3">
                    <Clock className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Sin historial de cambios</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Línea vertical del timeline */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

                  <div className="space-y-6">
                    {order.statusHistory.map((item) => {
                      const colors = statusColors[item.status as OrderStatusType];
                      const Icon = statusIcons[item.status as OrderStatusType];

                      return (
                        <div key={item.id} className="relative pl-14">
                          {/* Icono del estado */}
                          <div
                            className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br ${colors.gradient} shadow-md`}
                          >
                            <Icon className="h-5 w-5 text-white" />
                          </div>

                          {/* Contenido */}
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
                                <div className="flex gap-2 flex-wrap">
                                  {item.photos.map((photo, photoIndex) => (
                                    <button
                                      key={photoIndex}
                                      type="button"
                                      onClick={() => openGallery(item.photos, photoIndex)}
                                      className="group relative h-16 w-16 overflow-hidden rounded-lg bg-slate-100 shadow-sm transition-transform hover:scale-105"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={photo}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/40">
                                        <ZoomIn className="h-5 w-5 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
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

        {/* Tab: Abonos */}
        <TabsContent value="payments" className="mt-4">
          <Card className="rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-sm">
            <CardContent className="p-5">
              {order.payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="rounded-full bg-slate-100 p-3">
                    <Banknote className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm text-slate-500">Aún no hay abonos registrados</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Línea vertical del timeline */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-emerald-200" />

                  <div className="space-y-4">
                    {order.payments.map((payment) => {
                      const PaymentIcon =
                        paymentMethods.find((m) => m.id === payment.method)?.icon || DollarSign;

                      return (
                        <div key={payment.id} className="relative pl-14">
                          {/* Icono */}
                          <div className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-500 shadow-md">
                            <PaymentIcon className="h-5 w-5 text-white" />
                          </div>

                          {/* Contenido */}
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
                              <div className="mt-2 flex gap-2 flex-wrap">
                                {payment.photos.map((photo, photoIndex) => (
                                  <button
                                    key={photoIndex}
                                    type="button"
                                    onClick={() => openGallery(payment.photos, photoIndex)}
                                    className="group relative h-12 w-12 overflow-hidden rounded-lg bg-slate-100 transition-transform hover:scale-105"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={photo}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/40">
                                      <ZoomIn className="h-4 w-4 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                    </div>
                                  </button>
                                ))}
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

      {/* Modal de Galería de Imágenes */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-4xl border-0 bg-black/95 p-0 sm:rounded-2xl">
          <DialogTitle className="sr-only">
            Galería de imágenes - Foto {currentPhotoIndex + 1} de {galleryPhotos.length}
          </DialogTitle>
          <div className="relative flex flex-col p-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
              <span className="text-sm font-medium text-white/70">
                {currentPhotoIndex + 1} de {galleryPhotos.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsGalleryOpen(false)}
                className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Imagen principal */}
            <div className="relative flex items-center justify-center">
              {/* Botón anterior */}
              {galleryPhotos.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevPhoto}
                  className="absolute left-4 z-10 h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-110"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {/* Imagen */}
              <div className="relative aspect-square w-full max-h-[70vh] overflow-hidden rounded-xl">
                {galleryPhotos[currentPhotoIndex] && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={galleryPhotos[currentPhotoIndex]}
                    alt={`Foto ${currentPhotoIndex + 1}`}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              {/* Botón siguiente */}
              {galleryPhotos.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextPhoto}
                  className="absolute right-4 z-10 h-12 w-12 rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-110"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </div>

            {/* Thumbnails - Solo si hay más de 1 foto */}
            {galleryPhotos.length > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                {galleryPhotos.map((photo, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`h-14 w-14 overflow-hidden rounded-lg transition-all duration-200 ${
                      index === currentPhotoIndex
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black/95 scale-110'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Miniatura ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
