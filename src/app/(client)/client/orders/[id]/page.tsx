'use client';

import { useMemo } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Mail,
  Package,
  PackageCheck,
  Phone,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react';

import { OrderStatus, OrderStatusLabels, type OrderStatusType } from '@/lib/utils/status';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Tipos
interface StatusHistoryItem {
  id: string;
  status: OrderStatusType;
  date: string;
  time: string;
  observations: string;
  photos: string[];
  user: string;
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  time: string;
  method: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
  notes: string;
  photos: string[];
  user: string;
}

interface Order {
  id: string;
  client: {
    id: string;
    name: string;
    initials: string;
    email: string;
    phone: string;
    address: string;
  };
  description: string;
  serviceType: string;
  quantity: number;
  total: number;
  status: OrderStatusType;
  dueDate: string;
  createdAt: string;
  isDelayed: boolean;
  daysRemaining: number;
  isUrgent: boolean;
  statusHistory: StatusHistoryItem[];
  payments: Payment[];
}

// Métodos de pago disponibles
const paymentMethods = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'transferencia', label: 'Transferencia', icon: Wallet },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'otro', label: 'Otro', icon: DollarSign },
] as const;

// Mock data para simular el pedido del cliente
const mockClientOrders: Record<string, Order> = {
  'ORD-001': {
    id: 'ORD-001',
    client: {
      id: 'CLI-001',
      name: 'María García',
      initials: 'MG',
      email: 'maria@email.com',
      phone: '+54 9 11 1234-5678',
      address: 'Av. Corrientes 1234, CABA, Buenos Aires',
    },
    description: 'Bordado de logo corporativo en 50 camisas polo color azul marino',
    serviceType: 'Bordados',
    quantity: 50,
    total: 12500,
    status: OrderStatus.CONFECCION,
    dueDate: '2025-01-20',
    createdAt: '2025-01-10',
    isDelayed: false,
    daysRemaining: 5,
    isUrgent: false,
    statusHistory: [
      {
        id: '1',
        status: OrderStatus.RECIBIDO,
        date: '2025-01-10',
        time: '09:30:00',
        observations: 'Pedido recibido. Cliente entrega diseño vectorial del logo.',
        photos: [],
        user: 'Admin',
      },
      {
        id: '2',
        status: OrderStatus.CONFECCION,
        date: '2025-01-12',
        time: '14:15:00',
        observations: 'Inicio de producción. Prueba de bordado en muestra.',
        photos: [],
        user: 'Operador 1',
      },
    ],
    payments: [
      {
        id: 'PAY-001',
        amount: 5000,
        date: '2025-01-10',
        time: '09:45:00',
        method: 'efectivo',
        notes: 'Seña inicial del 40%',
        photos: [],
        user: 'Admin',
      },
      {
        id: 'PAY-002',
        amount: 3000,
        date: '2025-01-15',
        time: '14:30:00',
        method: 'transferencia',
        notes: 'Segundo abono',
        photos: ['https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop'],
        user: 'Admin',
      },
    ],
  },
  'ORD-002': {
    id: 'ORD-002',
    client: {
      id: 'CLI-001',
      name: 'María García',
      initials: 'MG',
      email: 'maria@email.com',
      phone: '+54 9 11 1234-5678',
      address: 'Av. Corrientes 1234, CABA, Buenos Aires',
    },
    description: 'Uniformes escolares con logo institucional',
    serviceType: 'DTF',
    quantity: 20,
    total: 8000,
    status: OrderStatus.RECIBIDO,
    dueDate: '2025-01-18',
    createdAt: '2025-01-12',
    isDelayed: true,
    daysRemaining: -2,
    isUrgent: true,
    statusHistory: [
      {
        id: '1',
        status: OrderStatus.RECIBIDO,
        date: '2025-01-12',
        time: '10:00:00',
        observations: 'Pedido recibido. Esperando confirmación de tallas.',
        photos: [],
        user: 'Admin',
      },
    ],
    payments: [],
  },
};

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

const segmentColors = [
  'bg-blue-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-sky-500',
];

export default function ClientOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  // Obtener orden según el ID de la URL (useMemo para evitar re-renders innecesarios)
  const order = useMemo(() => mockClientOrders[orderId] || null, [orderId]);

  // Calcular totales de pagos
  const totalPaid = order?.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remainingBalance = order ? order.total - totalPaid : 0;
  const paymentProgress = order ? (totalPaid / order.total) * 100 : 0;

  if (!order) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Package className="h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Pedido no encontrado</h2>
        <p className="mt-2 text-slate-500">El pedido {orderId} no existe o no tienes acceso.</p>
        <Link href="/client/panel">
          <Button className="mt-4 rounded-xl bg-blue-500 hover:bg-blue-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Panel
          </Button>
        </Link>
      </div>
    );
  }

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

  const currentStatusIndex = dynamicStatusFlow.indexOf(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/client/panel">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">Pedido {order.id}</h1>
              <Badge
                className={`${statusColors[order.status].light} ${statusColors[order.status].text} ${statusColors[order.status].border} border`}
              >
                {OrderStatusLabels[order.status]}
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Creado el {order.createdAt}</p>
          </div>
        </div>
      </div>

      {/* Timeline de Progreso */}
      <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="relative">
            {/* Línea de fondo gris */}
            <div className="absolute left-0 top-6 h-1 w-full rounded-full bg-slate-100" />

            {/* Segmentos de progreso */}
            <div className="absolute left-0 top-6 flex h-1 w-full">
              {dynamicStatusFlow.slice(0, -1).map((_, index) => {
                const segmentWidth = 100 / (dynamicStatusFlow.length - 1);
                const isCompleted = index < currentStatusIndex;

                return (
                  <div key={index} className="relative" style={{ width: `${segmentWidth}%` }}>
                    {isCompleted && (
                      <div
                        className={`absolute inset-0 rounded-full transition-all duration-700 ${dynamicSegmentColors[index]}`}
                        style={{ width: '100%' }}
                      />
                    )}
                  </div>
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

                return (
                  <div key={status} className="flex flex-col items-center">
                    <div
                      className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                        showAsCompleted
                          ? `bg-linear-to-br ${colors.gradient} shadow-lg`
                          : isCurrent
                            ? `${colors.bgLight} border-2 ${colors.border}`
                            : 'border-2 border-slate-200 bg-white'
                      }`}
                    >
                      {showAsCompleted ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <Icon className={`h-5 w-5 ${isCurrent ? colors.text : 'text-slate-300'}`} />
                      )}

                      {/* Efecto de pulso */}
                      {isCurrent && !isEntregadoFinal && (
                        <span
                          className={`absolute inset-0 animate-ping rounded-full ${colors.bgLight} opacity-50`}
                        />
                      )}
                    </div>

                    {/* Etiqueta y fecha */}
                    <div className="mt-3 text-center">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted || isCurrent ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {OrderStatusLabels[status]}
                      </p>
                      {order.statusHistory.find((h) => h.status === status) && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {order.statusHistory.find((h) => h.status === status)?.date}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido Principal */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Columna Izquierda - Resumen */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5 text-blue-500" />
                Resumen del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase">Descripción</p>
                <p className="mt-1 text-sm text-slate-700">{order.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Servicio</p>
                  <Badge variant="outline" className="mt-1">
                    {order.serviceType}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Cantidad</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {order.quantity} unidades
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Total</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">
                    ${order.total.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Fecha Entrega</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {order.dueDate}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contacto */}
          <Card className="mt-4 overflow-hidden rounded-2xl border-0 bg-blue-50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-blue-900">¿Tienes dudas sobre tu pedido?</p>
              <p className="mt-1 text-xs text-blue-700">Contáctanos para más información</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="rounded-lg flex-1 bg-white">
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  Llamar
                </Button>
                <Button size="sm" variant="outline" className="rounded-lg flex-1 bg-white">
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="payments" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
              <TabsTrigger
                value="payments"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <DollarSign className="mr-1.5 h-4 w-4" />
                Mis Abonos
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <Clock className="mr-1.5 h-4 w-4" />
                Historial
              </TabsTrigger>
            </TabsList>

            {/* Tab: Abonos */}
            <TabsContent value="payments" className="mt-4 space-y-4">
              {/* Resumen de Pagos */}
              <Card className="overflow-hidden rounded-2xl border-0 shadow-sm bg-linear-to-r from-emerald-50 to-teal-50">
                <CardHeader className="border-b border-slate-100 bg-linear-to-r from-emerald-50 to-teal-50">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    Estado de tu Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Barra de progreso */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-500">Progreso de pago</span>
                      <span className="font-semibold text-emerald-600">
                        {paymentProgress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                        style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Tarjetas de totales */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Total del Pedido */}
                    <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Total del Pedido</p>
                          <p className="mt-2 text-3xl font-bold text-slate-900">
                            ${order.total.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                          <Package className="h-7 w-7 text-slate-600" />
                        </div>
                      </div>
                    </div>

                    {/* Total Abonado */}
                    <div className="rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 p-5 shadow-lg shadow-emerald-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-emerald-100">Total Abonado</p>
                          <p className="mt-2 text-3xl font-bold text-white">
                            ${totalPaid.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                          <CheckCircle2 className="h-7 w-7 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Saldo Restante */}
                    <div
                      className={`rounded-2xl p-5 shadow-lg ${
                        remainingBalance > 0
                          ? 'bg-linear-to-br from-amber-400 to-amber-500 shadow-amber-200'
                          : 'bg-linear-to-br from-emerald-500 to-emerald-600 shadow-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className={`text-sm font-medium ${remainingBalance > 0 ? 'text-amber-100' : 'text-emerald-100'}`}
                          >
                            Saldo Restante
                          </p>
                          <p className="mt-2 text-3xl font-bold text-white">
                            ${remainingBalance.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                          {remainingBalance > 0 ? (
                            <DollarSign className="h-7 w-7 text-white" />
                          ) : (
                            <Check className="h-7 w-7 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estado del pago */}
                  {remainingBalance <= 0 ? (
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-100 p-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium text-emerald-700">
                        Tu pedido está pagado en su totalidad
                      </span>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-100 p-3">
                      <DollarSign className="h-5 w-5 text-amber-600" />
                      <span className="text-sm text-amber-700">
                        Tienes un saldo pendiente de{' '}
                        <strong>${remainingBalance.toLocaleString()}</strong>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Historial de Abonos */}
              <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-5 w-5 text-slate-500" />
                    Historial de Abonos ({order.payments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {order.payments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <Banknote className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-slate-900">
                        Aún no hay abonos registrados
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Los abonos aparecerán aquí cuando se registren
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Línea vertical del timeline */}
                      <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-emerald-200" />

                      <div className="space-y-6">
                        {order.payments
                          .slice()
                          .reverse()
                          .map((payment, index) => {
                            const PaymentIcon =
                              paymentMethods.find((m) => m.id === payment.method)?.icon ||
                              DollarSign;

                            return (
                              <div
                                key={payment.id}
                                className="relative pl-16"
                                style={{ animationDelay: `${index * 100}ms` }}
                              >
                                {/* Icono del método de pago */}
                                <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 shadow-lg">
                                  <PaymentIcon className="h-5 w-5 text-white" />
                                </div>

                                {/* Contenido del abono */}
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 transition-all duration-300 hover:shadow-md">
                                  {/* Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl font-bold text-emerald-600">
                                        ${payment.amount.toLocaleString()}
                                      </span>
                                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
                                        {paymentMethods.find((m) => m.id === payment.method)
                                          ?.label || 'Otro'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>{payment.date}</span>
                                      <span>•</span>
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>{payment.time}</span>
                                    </div>
                                  </div>

                                  {/* Notas */}
                                  {payment.notes && (
                                    <div className="mt-3">
                                      <p className="text-xs font-medium uppercase text-slate-400">
                                        Concepto
                                      </p>
                                      <p className="mt-1 text-sm text-slate-700">{payment.notes}</p>
                                    </div>
                                  )}

                                  {/* Comprobantes */}
                                  {payment.photos && payment.photos.length > 0 && (
                                    <div className="mt-3">
                                      <p className="mb-2 text-xs font-medium uppercase text-slate-400">
                                        Comprobantes ({payment.photos.length})
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {payment.photos.map((photo, photoIndex) => (
                                          <div
                                            key={photoIndex}
                                            className="relative h-14 w-14 overflow-hidden rounded-lg bg-slate-100"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={photo}
                                              alt={`Comprobante ${photoIndex + 1}`}
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
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

            {/* Tab: Historial */}
            <TabsContent value="history" className="mt-4">
              <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5 text-slate-500" />
                    Historial de tu Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="relative">
                    {/* Línea vertical del timeline */}
                    <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-slate-200" />

                    <div className="space-y-8">
                      {order.statusHistory
                        .slice()
                        .reverse()
                        .map((item, index) => {
                          const colors = statusColors[item.status];
                          const Icon = statusIcons[item.status];

                          return (
                            <div
                              key={item.id}
                              className="relative pl-16"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              {/* Icono del estado */}
                              <div
                                className={`absolute left-0 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${colors.gradient} shadow-lg`}
                              >
                                <Icon className="h-5 w-5 text-white" />
                              </div>

                              {/* Contenido */}
                              <div
                                className={`rounded-2xl border ${colors.border} ${colors.light} p-4`}
                              >
                                {/* Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <Badge className={`${colors.bg} border-0 text-white`}>
                                    {OrderStatusLabels[item.status]}
                                  </Badge>
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{item.date}</span>
                                    <span>•</span>
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{item.time}</span>
                                  </div>
                                </div>

                                {/* Observaciones */}
                                {item.observations && (
                                  <div className="mt-3">
                                    <p className="text-xs font-medium uppercase text-slate-400">
                                      Detalle
                                    </p>
                                    <p className="mt-1 text-sm text-slate-700">
                                      {item.observations}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
