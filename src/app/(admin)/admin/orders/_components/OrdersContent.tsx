'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { adminOrderFetcher, getAdminOrderSwrKey } from '@/hooks/use-orders';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { useSWRConfig } from 'swr';

import type { Order } from '@/lib/services/orders.server';
import { OrderStatus, type OrderStatusType } from '@/lib/utils/status';

import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ITEMS_PER_PAGE = 10;

// Función para obtener la prioridad del status (menor número = mayor prioridad)
function getStatusPriority(status: string, isUrgent: boolean): number {
  // Los urgentes siempre van primero
  if (isUrgent) return 0;

  // Luego por estado
  switch (status) {
    case OrderStatus.RECIBIDO:
    case OrderStatus.CONFECCION:
      return 1;
    case OrderStatus.RETIRO: // Listo para Retiro
      return 2;
    case OrderStatus.PARCIALMENTE_ENTREGADO:
      return 3;
    case OrderStatus.ENTREGADO:
      return 4;
    case OrderStatus.CANCELADO:
      return 5;
    default:
      return 6;
  }
}

interface OrdersContentProps {
  initialOrders: Order[];
}

export function OrdersContent({ initialOrders }: OrdersContentProps) {
  const orders = initialOrders;
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { mutate } = useSWRConfig();

  const prefetchOrder = useMemo(
    () => (orderId: string) => {
      mutate(getAdminOrderSwrKey(orderId), () => adminOrderFetcher(getAdminOrderSwrKey(orderId)));
    },
    [mutate]
  );

  // Extraer lista de clientes únicos de los pedidos
  const clients = useMemo(() => {
    const uniqueClients = new Map();
    orders.forEach((order) => {
      if (!uniqueClients.has(order.client.id)) {
        uniqueClients.set(order.client.id, { id: order.client.id, name: order.client.name });
      }
    });
    return Array.from(uniqueClients.values());
  }, [orders]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [inputFocused, setInputFocused] = useState(false);

  // Obtener cliente seleccionado
  const selectedClientData = clients.find((c) => c.id === selectedClient);

  // Filtrar clientes que coinciden con la búsqueda (para el autocompletado)
  const matchingClients = searchQuery.trim()
    ? clients.filter((client) => client.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // Mostrar dropdown de clientes cuando hay búsqueda y hay coincidencias
  const showClientSuggestions = inputFocused && searchQuery.trim() && matchingClients.length > 0;

  // Filtrar y ordenar pedidos
  const filteredOrders = useMemo(() => {
    return (
      orders
        .filter((order) => {
          const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
          const matchesSearch =
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesClient = selectedClient === 'all' || order.client.id === selectedClient;
          return matchesStatus && matchesSearch && matchesClient;
        })
        // Ordenar: urgentes primero, luego por prioridad de estado, luego por fecha
        .sort((a, b) => {
          const priorityA = getStatusPriority(a.status, a.isUrgent);
          const priorityB = getStatusPriority(b.status, b.isUrgent);

          // Si tienen diferente prioridad, ordenar por prioridad
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          // Si tienen la misma prioridad, ordenar por fecha (más reciente primero)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
    );
  }, [orders, selectedStatus, searchQuery, selectedClient]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Resetear página cuando cambian los filtros
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    setSearchQuery('');
    setInputFocused(false);
    setCurrentPage(1);
  };

  // Contadores por estado
  const statusCounts = {
    all: orders.length,
    [OrderStatus.RECIBIDO]: orders.filter((o) => o.status === OrderStatus.RECIBIDO).length,
    [OrderStatus.CONFECCION]: orders.filter((o) => o.status === OrderStatus.CONFECCION).length,
    [OrderStatus.RETIRO]: orders.filter((o) => o.status === OrderStatus.RETIRO).length,
    [OrderStatus.PARCIALMENTE_ENTREGADO]: orders.filter(
      (o) => o.status === OrderStatus.PARCIALMENTE_ENTREGADO
    ).length,
    [OrderStatus.ENTREGADO]: orders.filter((o) => o.status === OrderStatus.ENTREGADO).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Pedidos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra y da seguimiento a todos los pedidos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Link href="/admin/orders/new">
            <Button className="h-10 gap-2 rounded-full bg-blue-500 px-5 text-white hover:bg-blue-600">
              <Plus className="h-4 w-4" />
              Nuevo Pedido
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Búsqueda con autocompletado de clientes */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          {/* Indicador de cliente seleccionado */}
          {selectedClient !== 'all' && selectedClientData && (
            <div className="absolute left-10 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                <User className="h-3 w-3" />
                {selectedClientData.name}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient('all');
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </div>
          )}

          <Input
            placeholder={
              selectedClient !== 'all'
                ? ''
                : 'Buscar por ID, descripción o escribir nombre de cliente...'
            }
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
            className={`h-10 rounded-xl border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-blue-500 ${
              selectedClient !== 'all' ? 'pl-[180px]' : 'pl-10'
            }`}
          />

          {/* Dropdown de sugerencias de clientes */}
          {showClientSuggestions && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-medium text-slate-400">
                  Clientes encontrados ({matchingClients.length})
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto py-1">
                {matchingClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleClientSelect(client.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-blue-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-xs font-medium text-white">
                      {client.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{client.name}</p>
                      <p className="text-xs text-slate-400">Ver todos sus pedidos</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs de estado */}
        <Tabs value={selectedStatus} onValueChange={handleStatusChange} className="w-auto">
          <TabsList className="h-10 rounded-xl bg-slate-100 p-1">
            <TabsTrigger
              value="all"
              className="rounded-lg px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Todos ({statusCounts.all})
            </TabsTrigger>
            <TabsTrigger
              value={OrderStatus.RECIBIDO}
              className="flex items-center gap-1.5 rounded-lg px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Recibidos ({statusCounts[OrderStatus.RECIBIDO]})
            </TabsTrigger>
            <TabsTrigger
              value={OrderStatus.CONFECCION}
              className="flex items-center gap-1.5 rounded-lg px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              Confección ({statusCounts[OrderStatus.CONFECCION]})
            </TabsTrigger>
            <TabsTrigger
              value={OrderStatus.RETIRO}
              className="flex items-center gap-1.5 rounded-lg px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Retiro ({statusCounts[OrderStatus.RETIRO]})
            </TabsTrigger>
            <TabsTrigger
              value={OrderStatus.PARCIALMENTE_ENTREGADO}
              className="flex items-center gap-1.5 rounded-lg px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              Parcial ({statusCounts[OrderStatus.PARCIALMENTE_ENTREGADO]})
            </TabsTrigger>
            <TabsTrigger
              value={OrderStatus.ENTREGADO}
              className="flex items-center gap-1.5 rounded-lg px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <div className="h-2 w-2 rounded-full bg-sky-500" />
              Entregados ({statusCounts[OrderStatus.ENTREGADO]})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tabla de Pedidos */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Lista de Pedidos
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''} encontrado
              {filteredOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold uppercase text-slate-400">
                  Pedido
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">
                  Cliente
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">
                  Descripción
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">
                  Estado
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">
                  Entrega
                </TableHead>
                <TableHead className="text-center text-xs font-semibold uppercase text-slate-400">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order) => {
                const hasPendingBalance =
                  order.status !== OrderStatus.CANCELADO && (order.remainingBalance ?? 0) > 0;
                return (
                  <TableRow
                    key={order.id}
                    className={`group cursor-pointer border-slate-100 transition-colors hover:bg-blue-50/50 ${
                      hasPendingBalance ? 'border-l-4 border-l-amber-400 bg-amber-50/40' : ''
                    }`}
                  >
                    <TableCell className="pl-6">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="block"
                        onMouseEnter={() => prefetchOrder(order.id)}
                        onFocus={() => prefetchOrder(order.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                            {order.id}
                          </span>
                          {order.isUrgent && order.status !== OrderStatus.ENTREGADO && (
                            <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                              <AlertTriangle className="h-3 w-3" />
                              URGENTE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{order.quantity} unidades</p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center gap-2"
                        onMouseEnter={() => prefetchOrder(order.id)}
                        onFocus={() => prefetchOrder(order.id)}
                      >
                        <Avatar className="h-8 w-8 border border-slate-100">
                          <AvatarFallback className="bg-linear-to-br from-blue-500 to-blue-600 text-xs text-white">
                            {order.client.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900">{order.client.name}</p>
                          <p className="text-xs text-slate-400">{order.client.email}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="block max-w-[200px]"
                        onMouseEnter={() => prefetchOrder(order.id)}
                        onFocus={() => prefetchOrder(order.id)}
                      >
                        <p className="truncate text-sm text-slate-700">{order.description}</p>
                        <Badge
                          variant="outline"
                          className="mt-1 border-slate-200 bg-slate-50 text-xs font-normal text-slate-500"
                        >
                          {order.serviceType}
                        </Badge>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status as OrderStatusType} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {order.isDelayed ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-rose-500" />
                            <span className="text-sm font-medium text-rose-600">
                              {Math.abs(order.daysRemaining)}d tarde
                            </span>
                          </>
                        ) : order.daysRemaining === 0 ? (
                          <>
                            <Clock className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium text-amber-600">Hoy</span>
                          </>
                        ) : order.status === OrderStatus.ENTREGADO ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-sky-500" />
                            <span className="text-sm text-sky-600">Completado</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm text-slate-600">{order.daysRemaining}d</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold text-emerald-500 text-sm">
                          ${order.total.toLocaleString()}
                        </span>
                        {hasPendingBalance && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                            title="Saldo pendiente por cobrar"
                          >
                            ${(order.remainingBalance ?? 0).toLocaleString()} pend.
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-slate-100 p-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">No se encontraron pedidos</p>
              <p className="mt-1 text-sm text-slate-400">
                Intenta con otros filtros o crea un nuevo pedido
              </p>
              <Link href="/admin/orders/new">
                <Button className="mt-4 rounded-xl bg-blue-500 hover:bg-blue-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Pedido
                </Button>
              </Link>
            </div>
          )}

          {/* Paginación */}
          {filteredOrders.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredOrders.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
