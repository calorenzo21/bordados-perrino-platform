'use client';

import { useEffect, useMemo, useState } from 'react';

import { useTheme } from 'next-themes';
import Link from 'next/link';

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Loader2,
  MoreHorizontal,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';

import { SERVICE_COLORS } from '@/lib/constants';
import type { DashboardData, RecentExpense, TopClient } from '@/lib/services/dashboard.server';
import { expenseTypeColorToBadgeClasses } from '@/lib/utils/expense-type-badge';
import { OrderStatus, type OrderStatusType } from '@/lib/utils/status';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Configuración del gráfico de líneas
const chartConfig = {
  orders: {
    label: 'Pedidos',
    color: 'hsl(217, 91%, 60%)',
  },
} satisfies ChartConfig;

const serviceColors = SERVICE_COLORS;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Función para calcular porcentaje de forma segura (evita NaN)
function safePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Función para formatear tiempo relativo
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 5) {
    return 'justo ahora';
  } else if (diffInSeconds < 60) {
    return `hace ${diffInSeconds} seg`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `hace ${minutes} min`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `hace ${days} día${days > 1 ? 's' : ''}`;
  }
}

interface DashboardContentProps {
  initialData: DashboardData;
}

export function DashboardContent({ initialData }: DashboardContentProps) {
  // Parse initial data
  const {
    metrics,
    ordersByMonth: dbOrdersByMonth,
    ordersByStatus: dbOrdersByStatus,
    ordersByService,
    recentOrders: dbRecentOrders,
    recentExpenses: dbRecentExpenses,
    topClients: dbTopClients,
    lastUpdated: initialLastUpdated,
  } = initialData;

  const [chartPeriod, setChartPeriod] = useState<6 | 12>(6);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date(initialLastUpdated));
  const [timeAgoText, setTimeAgoText] = useState<string>('justo ahora');

  // Actualizar el texto de tiempo cada 10 segundos
  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgoText(formatTimeAgo(lastUpdated));
    };

    // Actualizar inmediatamente
    updateTimeAgo();

    // Actualizar cada 10 segundos
    const interval = setInterval(updateTimeAgo, 10000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Transformar datos de estado a formato del dashboard
  const ordersByStatus = useMemo(() => {
    const statusMap: Record<string, number> = {
      [OrderStatus.RECIBIDO]: 0,
      [OrderStatus.CONFECCION]: 0,
      [OrderStatus.RETIRO]: 0,
      [OrderStatus.PARCIALMENTE_ENTREGADO]: 0,
      [OrderStatus.ENTREGADO]: 0,
      [OrderStatus.CANCELADO]: 0,
    };
    dbOrdersByStatus.forEach((s) => {
      statusMap[s.status] = s.count;
    });
    return statusMap;
  }, [dbOrdersByStatus]);

  // Transformar datos de pedidos recientes
  const recentOrders = useMemo(() => {
    return dbRecentOrders.map((order) => ({
      id: order.order_number || order.id,
      client: {
        name: order.client_name,
        initials: getInitials(order.client_name),
      },
      product: order.description,
      serviceType: order.service_type,
      quantity: order.quantity,
      revenue: order.total,
      status: order.status as OrderStatusType,
      dueDate: order.due_date,
      isDelayed: order.is_delayed || false,
      daysRemaining: order.days_remaining || 0,
    }));
  }, [dbRecentOrders]);

  // Transformar volumen por servicio
  const serviceVolume = useMemo(() => {
    const totalCount = ordersByService.reduce((sum, s) => sum + s.count, 0);
    return ordersByService.map((s) => ({
      type: s.serviceType,
      count: s.count,
      revenue: s.total,
      color: s.color || serviceColors[s.serviceType] || 'bg-slate-500',
      percentage: totalCount > 0 ? Math.round((s.count / totalCount) * 100) : 0,
    }));
  }, [ordersByService]);

  // Transformar datos de pedidos por mes al formato esperado
  const allOrdersByMonth = useMemo(() => {
    return dbOrdersByMonth.map((m) => ({
      month: m.month,
      monthFull: m.monthFull,
      orders: m.count,
      revenue: m.revenue,
    }));
  }, [dbOrdersByMonth]);

  // Clientes top
  const topClients = dbTopClients;

  // Gastos recientes
  const recentExpenses = dbRecentExpenses;

  // Métricas de tiempo — usa el conteo del servidor sobre TODOS los pedidos activos,
  // no sobre la muestra de 5 pedidos recientes que se muestra en la tabla.
  const timeMetrics = useMemo(() => {
    const totalActive = metrics?.activeOrders || 0;
    const delayed = metrics?.delayedOrders || 0;
    return {
      onTime: totalActive - delayed,
      delayed,
      totalActive,
    };
  }, [metrics]);

  // Métricas de gastos
  const expenseMetrics = useMemo(
    () => ({
      totalExpenses: metrics?.monthlyExpenses || 0,
      thisMonthExpenses: metrics?.monthlyExpenses || 0,
      lastMonthExpenses: metrics?.prevMonthlyExpenses || 0,
      totalRecords: recentExpenses.length,
    }),
    [metrics, recentExpenses]
  );

  // Métricas de ingresos
  const revenueMetrics = useMemo(
    () => ({
      thisMonth: metrics?.monthlyRevenue || 0,
      lastMonth: metrics?.prevMonthlyRevenue || 0,
    }),
    [metrics]
  );

  const totalActiveOrders =
    ordersByStatus[OrderStatus.RECIBIDO] +
    ordersByStatus[OrderStatus.CONFECCION] +
    ordersByStatus[OrderStatus.RETIRO] +
    ordersByStatus[OrderStatus.PARCIALMENTE_ENTREGADO];

  // Filtrar datos según el período seleccionado
  const ordersByMonth = chartPeriod === 6 ? allOrdersByMonth.slice(-6) : allOrdersByMonth;

  // Calcular el total de pedidos en el período
  const totalOrdersInPeriod = ordersByMonth.reduce((a, b) => a + b.orders, 0);

  // Encontrar el mejor mes
  const bestMonth =
    ordersByMonth.length > 0
      ? ordersByMonth.reduce(
          (best, current) => (current.orders > best.orders ? current : best),
          ordersByMonth[0]
        )
      : { month: '-', monthFull: '-', orders: 0, revenue: 0 };

  // Calcular promedio mensual
  const averageMonthly =
    ordersByMonth.length > 0 ? Math.round(totalOrdersInPeriod / ordersByMonth.length) : 0;

  // Calcular ingresos totales
  const totalRevenue = ordersByMonth.reduce((a, b) => a + b.revenue, 0);

  // Calcular % de cambio (comparando con período anterior)
  const previousPeriodOrders =
    chartPeriod === 6
      ? allOrdersByMonth.slice(-12, -6).reduce((a, b) => a + b.orders, 0)
      : totalOrdersInPeriod;
  const percentageChange =
    previousPeriodOrders > 0
      ? (((totalOrdersInPeriod - previousPeriodOrders) / previousPeriodOrders) * 100).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Resumen general del negocio • Actualizado {timeAgoText}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="h-10 gap-2 rounded-full bg-blue-500 px-5 text-white hover:bg-blue-600"
            disabled
            title="Próximamente"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* ============================================ */}
      {/* MÉTRICAS PRINCIPALES */}
      {/* ============================================ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3 min-[1741px]:gap-4">
        <MetricCard
          title="Pedidos Activos"
          value={totalActiveOrders.toString()}
          description="En proceso actualmente"
          icon={Package}
          iconColor="blue"
        />
        <MetricCard
          title="Ingresos del Mes"
          value={`$${revenueMetrics.thisMonth.toLocaleString()}`}
          description={`vs. $${revenueMetrics.lastMonth.toLocaleString()} mes anterior`}
          icon={TrendingUp}
          iconColor="green"
        />
        <MetricCard
          title="Gastos del Mes"
          value={`$${expenseMetrics.thisMonthExpenses.toLocaleString()}`}
          description={`vs. $${expenseMetrics.lastMonthExpenses.toLocaleString()} mes anterior`}
          icon={TrendingDown}
          iconColor="rose"
        />
        <MetricCard
          title="Pendiente por Cobrar"
          value={`$${(metrics?.pendingToCollect ?? 0).toLocaleString()}`}
          description="Saldo pendiente en pedidos"
          icon={DollarSign}
          iconColor="purple"
        />
        <MetricCard
          title="Pedidos Completados"
          value={ordersByStatus[OrderStatus.ENTREGADO].toString()}
          description="Histórico total"
          icon={ShoppingCart}
          iconColor="amber"
        />
      </div>

      {/* ============================================ */}
      {/* ESTADO DE PEDIDOS + MÉTRICAS DE TIEMPO */}
      {/* ============================================ */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Pedidos por Estado */}
        <Card className="rounded-2xl border-0 shadow-sm lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Pedidos por Estado
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Distribución actual de pedidos activos
              </p>
            </div>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm" className="gap-1 text-blue-500 hover:text-blue-600">
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Recibido */}
              <div className="group relative overflow-hidden rounded-xl border border-blue-100 dark:border-blue-700/50 bg-gradient-to-br from-blue-50 dark:from-blue-900/45 to-white dark:to-slate-800 p-5 transition-all hover:border-blue-200 dark:hover:border-blue-600 hover:shadow-md">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-100/50 dark:bg-blue-700/25" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Recibidos
                    </span>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/50">
                      Nuevo
                    </Badge>
                  </div>
                  <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-slate-50">
                    {ordersByStatus[OrderStatus.RECIBIDO]}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Esperando inicio
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/40">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${safePercentage(ordersByStatus[OrderStatus.RECIBIDO], totalActiveOrders)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {safePercentage(ordersByStatus[OrderStatus.RECIBIDO], totalActiveOrders)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* En Confección */}
              <div className="group relative overflow-hidden rounded-xl border border-amber-100 dark:border-amber-700/50 bg-gradient-to-br from-amber-50 dark:from-amber-900/45 to-white dark:to-slate-800 p-5 transition-all hover:border-amber-200 dark:hover:border-amber-600 hover:shadow-md">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-100/50 dark:bg-amber-700/25" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      En Confección
                    </span>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900/50">
                      En proceso
                    </Badge>
                  </div>
                  <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-slate-50">
                    {ordersByStatus[OrderStatus.CONFECCION]}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Producción activa
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/40">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{
                          width: `${safePercentage(ordersByStatus[OrderStatus.CONFECCION], totalActiveOrders)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {safePercentage(ordersByStatus[OrderStatus.CONFECCION], totalActiveOrders)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Listo para Retiro */}
              <div className="group relative overflow-hidden rounded-xl border border-emerald-100 dark:border-emerald-700/50 bg-gradient-to-br from-emerald-50 dark:from-emerald-900/45 to-white dark:to-slate-800 p-5 transition-all hover:border-emerald-200 dark:hover:border-emerald-600 hover:shadow-md">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-100/50 dark:bg-emerald-700/25" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Listo para Retiro
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50">
                      Completado
                    </Badge>
                  </div>
                  <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-slate-50">
                    {ordersByStatus[OrderStatus.RETIRO]}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Pendiente de entrega
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${safePercentage(ordersByStatus[OrderStatus.RETIRO], totalActiveOrders)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {safePercentage(ordersByStatus[OrderStatus.RETIRO], totalActiveOrders)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Parcialmente Entregado */}
              <div className="group relative overflow-hidden rounded-xl border border-purple-100 dark:border-purple-700/50 bg-gradient-to-br from-purple-50 dark:from-purple-900/45 to-white dark:to-slate-800 p-5 transition-all hover:border-purple-200 dark:hover:border-purple-600 hover:shadow-md">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-100/50 dark:bg-purple-700/25" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Parcialmente Entregado
                    </span>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900/50">
                      Parcial
                    </Badge>
                  </div>
                  <p className="mt-3 text-4xl font-bold text-slate-900 dark:text-slate-50">
                    {ordersByStatus[OrderStatus.PARCIALMENTE_ENTREGADO]}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Entregas parciales
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40">
                      <div
                        className="h-full rounded-full bg-purple-500"
                        style={{
                          width: `${safePercentage(ordersByStatus[OrderStatus.PARCIALMENTE_ENTREGADO], totalActiveOrders)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {safePercentage(
                        ordersByStatus[OrderStatus.PARCIALMENTE_ENTREGADO],
                        totalActiveOrders
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas de Tiempo */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Cumplimiento de Tiempos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* En tiempo */}
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-800/40">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {timeMetrics.onTime}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">En tiempo</p>
              </div>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-800/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {safePercentage(timeMetrics.onTime, timeMetrics.totalActive)}%
              </span>
            </div>

            {/* Retrasados */}
            <div className="flex items-center gap-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-800/40">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {timeMetrics.delayed}
                </p>
                <p className="text-sm text-rose-600 dark:text-rose-400">Retrasados</p>
              </div>
              <span className="rounded-full bg-rose-100 dark:bg-rose-800/60 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {safePercentage(timeMetrics.delayed, timeMetrics.totalActive)}%
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="pt-2">
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="bg-emerald-500"
                  style={{
                    width: `${safePercentage(timeMetrics.onTime, timeMetrics.totalActive)}%`,
                  }}
                />
                <div
                  className="bg-rose-500"
                  style={{
                    width: `${safePercentage(timeMetrics.delayed, timeMetrics.totalActive)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                {timeMetrics.totalActive} pedidos activos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* VOLUMEN POR SERVICIO + PEDIDOS POR FECHA + ÚLTIMOS GASTOS */}
      {/* ============================================ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Volumen por Tipo de Servicio */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Volumen por Servicio
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Distribución de trabajos
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem className="rounded-lg" disabled>
                  Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg" disabled>
                  Exportar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceVolume.map((service) => (
              <div key={service.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${service.color}`} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {service.type}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {service.count}
                    </span>
                    <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">pedidos</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${service.color}`}
                      style={{ width: `${service.percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                    {service.percentage}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  ${service.revenue.toLocaleString()} en ingresos
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Columna derecha: Pedidos por Período + Últimos Gastos */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pedidos por Rango de Fechas */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Pedidos por Período
                </CardTitle>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                    {totalOrdersInPeriod}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    pedidos totales
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                      parseFloat(percentageChange) >= 0
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}
                  >
                    {parseFloat(percentageChange) >= 0 ? '↑' : '↓'}{' '}
                    {Math.abs(parseFloat(percentageChange))}%
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={chartPeriod === 6 ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 rounded-lg text-xs ${
                    chartPeriod === 6
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'border-slate-200 dark:border-slate-600 dark:text-slate-300'
                  }`}
                  onClick={() => setChartPeriod(6)}
                >
                  6 meses
                </Button>
                <Button
                  variant={chartPeriod === 12 ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 rounded-lg text-xs ${
                    chartPeriod === 12
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'border-slate-200 dark:border-slate-600 dark:text-slate-300'
                  }`}
                  onClick={() => setChartPeriod(12)}
                >
                  12 meses
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Gráfico de líneas con puntos */}
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <LineChart
                  accessibilityLayer
                  data={ordersByMonth}
                  margin={{
                    left: 12,
                    right: 12,
                    top: 12,
                    bottom: 12,
                  }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{value}</span>
                            <span className="text-slate-500 dark:text-slate-400">pedidos</span>
                          </div>
                        )}
                        hideLabel
                      />
                    }
                  />
                  <Line
                    dataKey="orders"
                    type="natural"
                    stroke="var(--color-orders)"
                    strokeWidth={2.5}
                    dot={{
                      fill: 'var(--color-orders)',
                      strokeWidth: 2,
                      r: 4,
                      stroke: '#fff',
                    }}
                    activeDot={{
                      r: 6,
                      fill: 'var(--color-orders)',
                      stroke: '#fff',
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ChartContainer>

              {/* Resumen */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {averageMonthly}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Promedio mensual</p>
                </div>
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {bestMonth.orders}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mejor mes ({bestMonth.monthFull})
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    ${(totalRevenue / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ingresos totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Últimos Gastos */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Últimos Gastos
                </CardTitle>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Registros más recientes
                </p>
              </div>
              <Link href="/admin/expenses">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-blue-500 hover:text-blue-600"
                >
                  Ver todos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                      Tipo
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                      Descripción
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                      Fecha
                    </TableHead>
                    <TableHead className="pr-6 text-right text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                      Monto
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExpenses.slice(0, 5).map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <TableCell className="pl-6">
                        <Badge
                          variant="outline"
                          className={`font-medium ${expenseTypeColorToBadgeClasses(expense.typeColor)}`}
                        >
                          {expense.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {expense.description}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {expense.date}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          -${expense.amount.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ============================================ */}
      {/* PEDIDOS RECIENTES + CLIENTES TOP */}
      {/* ============================================ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tabla de Pedidos Recientes */}
        <Card className="rounded-2xl border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Pedidos Recientes
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Últimos pedidos con acciones rápidas
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/orders">
                <Button size="sm" className="h-8 rounded-lg bg-blue-500 hover:bg-blue-600">
                  Ver todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                    Pedido
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                    Cliente
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                    Servicio
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                    Estado
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                    Entrega
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <TableCell>
                      <div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {order.id}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {order.quantity} unidades
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border border-slate-100 dark:border-slate-700">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-xs text-white">
                            {order.client.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {order.client.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-slate-50 font-normal text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      >
                        {order.serviceType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {order.status === OrderStatus.ENTREGADO ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-sky-500" />
                            <span className="text-sm text-sky-600 dark:text-sky-400">
                              Completado
                            </span>
                          </>
                        ) : order.isDelayed ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                            <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                              {Math.abs(order.daysRemaining)}d tarde
                            </span>
                          </>
                        ) : order.daysRemaining === 0 ? (
                          <>
                            <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                              Hoy
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {order.daysRemaining}d restantes
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem className="rounded-lg">Ver detalles</DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg">Editar pedido</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="rounded-lg text-blue-600">
                            → Pasar a Confección
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg text-emerald-600">
                            → Marcar para Retiro
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg text-slate-600">
                            → Marcar Entregado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Clientes Top */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Clientes Destacados
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Por volumen de pedidos
              </p>
            </div>
            <Link href="/admin/clients">
              <Button variant="ghost" size="sm" className="gap-1 text-blue-500 hover:text-blue-600">
                Ver todos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {topClients.map((client, index) => (
              <div
                key={client.name}
                className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 p-3 transition-all hover:border-blue-100 hover:bg-blue-50/50 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {client.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {client.orders} pedidos
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-600">
                    $
                    {client.revenue.toLocaleString('es-AR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              </div>
            ))}

            <Link href="/admin/clients">
              <Button
                variant="outline"
                className="mt-4 w-full rounded-xl border-slate-200 text-slate-600 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700/50"
              >
                <Users className="mr-2 h-4 w-4" />
                Gestionar Clientes
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
