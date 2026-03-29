'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useClient } from '@/hooks/use-clients';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  DollarSign,
  Heart,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';

import type { ClientDetail } from '@/lib/types/admin.types';
import { OrderStatus, type OrderStatusType } from '@/lib/utils/status';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Función para calcular estadísticas
const getStatusColor = (status: OrderStatusType) => {
  const colors = {
    [OrderStatus.RECIBIDO]: 'from-blue-500 to-blue-600',
    [OrderStatus.CONFECCION]: 'from-amber-500 to-amber-600',
    [OrderStatus.RETIRO]: 'from-emerald-500 to-emerald-600',
    [OrderStatus.PARCIALMENTE_ENTREGADO]: 'from-purple-500 to-purple-600',
    [OrderStatus.ENTREGADO]: 'from-sky-500 to-sky-600',
    [OrderStatus.CANCELADO]: 'from-rose-500 to-rose-600',
  };
  return colors[status] || 'from-slate-500 to-slate-600';
};

export function ClientDetailClient({
  clientId,
  initialClient,
}: {
  clientId: string;
  initialClient: ClientDetail | null;
}) {
  const router = useRouter();
  const {
    client,
    isLoading: loading,
    refetch,
  } = useClient(clientId, {
    fallbackData: initialClient,
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    cedula: '',
    address: '',
  });

  useEffect(() => {
    if (client) {
      setEditData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        cedula: client.cedula,
        address: client.address,
      });
    }
  }, [client]);

  const handleDelete = async () => {
    if (!client) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      setIsDeleteDialogOpen(false);
      router.push('/admin/clients');
    } catch (err: unknown) {
      console.error('Error deleting client:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!client) return;

    setIsSaving(true);
    setEditError(null);

    try {
      const response = await fetch('/api/clients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: client.id,
          name: editData.name,
          email: editData.email,
          phone: editData.phone,
          cedula: editData.cedula,
          address: editData.address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar el cliente');
      }

      setIsEditDialogOpen(false);
      // Refrescar datos
      refetch();
    } catch (err: any) {
      console.error('Error updating client:', err);
      setEditError(err.message || 'Error al actualizar el cliente');
    } finally {
      setIsSaving(false);
    }
  };

  if (!initialClient && loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <User className="h-16 w-16 text-slate-300 dark:text-slate-600" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Cliente no encontrado
        </h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">El cliente {clientId} no existe.</p>
        <Link href="/admin/clients">
          <Button className="mt-4 rounded-xl bg-blue-500 hover:bg-blue-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Clientes
          </Button>
        </Link>
      </div>
    );
  }

  // Calcular estadísticas adicionales
  const serviceTypeStats = client.orders.reduce(
    (acc, order) => {
      acc[order.serviceType] = (acc[order.serviceType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const mostUsedService = Object.entries(serviceTypeStats).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/clients">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-white shadow-lg dark:border-slate-600">
              <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                {client.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {client.name}
                </h1>
              </div>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Cliente desde{' '}
                {new Date(client.createdAt).toLocaleDateString('es-AR', {
                  year: 'numeric',
                  month: 'long',
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/admin/orders/new?client=${client.id}`}>
            <Button variant="outline" className="h-10 gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Nuevo Pedido
            </Button>
          </Link>
          <Button
            className="h-10 gap-2 rounded-xl bg-blue-500 hover:bg-blue-600"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Mail className="h-4 w-4" />
            Editar Datos
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem className="rounded-lg" disabled>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Email
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg" disabled>
                <Phone className="mr-2 h-4 w-4" />
                Llamar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-lg text-rose-600 dark:text-rose-400"
                onSelect={() => setIsDeleteDialogOpen(true)}
              >
                Eliminar Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Métricas principales - Estilo Dashboard */}
      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Pedidos Totales"
          value={client.totalOrders.toString()}
          description={`${client.activeOrders} activos actualmente`}
          icon={ShoppingBag}
          trend={
            client.activeOrders > 0 ? { value: client.activeOrders, isPositive: true } : undefined
          }
          iconColor="blue"
        />
        <MetricCard
          title="Total Facturado"
          value={`$${client.totalSpent.toLocaleString()}`}
          description={`Desde ${new Date(client.createdAt).getFullYear()}`}
          icon={DollarSign}
          iconColor="green"
        />
        <MetricCard
          title="Ticket Promedio"
          value={`$${client.averageOrderValue.toLocaleString()}`}
          description="Por pedido"
          icon={Receipt}
          iconColor="purple"
        />
        <MetricCard
          title="Servicio Favorito"
          value={mostUsedService?.[0] || 'Sin servicio favorito'}
          description={mostUsedService ? `${mostUsedService[1]} pedidos` : 'Sin pedidos'}
          icon={Heart}
          iconColor="rose"
          valueClassName="text-lg sm:text-xl font-bold line-clamp-2 leading-snug min-h-[2.5rem]"
        />
      </div>

      {/* Información de contacto */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-24">
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-100/70 px-4 py-3 sm:col-span-6 dark:border-blue-800/50 dark:bg-blue-900/20">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-200 dark:bg-blue-800/40">
            <Mail className="h-4 w-4 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase text-blue-500 dark:text-blue-400">
              Email
            </p>
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
              {client.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-100/70 px-4 py-3 sm:col-span-3 dark:border-amber-800/50 dark:bg-amber-900/20">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200 dark:bg-amber-800/40">
            <IdCard className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase text-amber-500 dark:text-amber-400">
              Cédula / DNI
            </p>
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
              {client.cedula || '-'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-100/70 px-4 py-3 sm:col-span-4 dark:border-emerald-800/50 dark:bg-emerald-900/20">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-200 dark:bg-emerald-800/40">
            <Phone className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase text-emerald-500 dark:text-emerald-400">
              Teléfono
            </p>
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
              {client.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-100/70 px-4 py-3 sm:col-span-11 dark:border-purple-800/50 dark:bg-purple-900/20">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-200 dark:bg-purple-800/40">
            <MapPin className="h-4 w-4 text-purple-700 dark:text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase text-purple-500 dark:text-purple-400">
              Dirección
            </p>
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
              {client.address || 'Sin dirección registrada'}
            </p>
          </div>
        </div>
      </div>

      {/* Historial de Pedidos */}
      <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-700">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold dark:text-slate-100">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Historial de Pedidos
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {client.orders.length} pedido{client.orders.length !== 1 ? 's' : ''} en total
            </p>
          </div>
          <Link href={`/admin/orders?client=${client.id}`}>
            <Button variant="outline" size="sm" className="rounded-lg">
              Ver en Pedidos
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent dark:border-slate-700">
                <TableHead className="pl-6 text-xs font-semibold uppercase text-slate-400 dark:text-slate-300">
                  Pedido
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-300">
                  Descripción
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-300">
                  Servicio
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-300">
                  Estado
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-300">
                  Fecha
                </TableHead>
                <TableHead className="pr-6 text-right text-xs font-semibold uppercase text-slate-400 dark:text-slate-300">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="group cursor-pointer border-slate-100 transition-colors hover:bg-blue-50/50 dark:border-slate-700 dark:hover:bg-slate-700/50"
                >
                  <TableCell className="pl-6">
                    <Link href={`/admin/orders/${order.id}`} className="block">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${getStatusColor(order.status as OrderStatusType)} shadow-sm`}
                        >
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-slate-100">
                            {order.id}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {order.quantity} unidades
                          </p>
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/orders/${order.id}`} className="block max-w-[200px]">
                      <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                        {order.description}
                      </p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    >
                      {order.serviceType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status as OrderStatusType} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      {order.date}
                    </div>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      ${order.total.toLocaleString()}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {client.orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                Sin pedidos aún
              </p>
              <Link href={`/admin/orders/new?client=${client.id}`}>
                <Button className="mt-4 rounded-xl bg-blue-500 hover:bg-blue-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Pedido
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edición */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditError(null);
          setIsEditDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle>Editar Datos del Cliente</DialogTitle>
            <DialogDescription>
              Actualiza la información de contacto de {client.name}
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400 dark:border dark:border-red-800/50">
              {editError}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium dark:text-slate-300">Nombre Completo</label>
              <Input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="h-10 rounded-xl dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="Nombre del cliente"
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium dark:text-slate-300">Email</label>
              <Input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="h-10 rounded-xl dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="email@ejemplo.com"
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium dark:text-slate-300">Cédula / DNI</label>
                <Input
                  value={editData.cedula}
                  onChange={(e) => setEditData({ ...editData, cedula: e.target.value })}
                  className="h-10 rounded-xl dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                  placeholder="Ej: 27.456.789-0"
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium dark:text-slate-300">Teléfono</label>
                <Input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="h-10 rounded-xl dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                  placeholder="+54 9 11 1234-5678"
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium dark:text-slate-300">Dirección</label>
              <Input
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                className="h-10 rounded-xl dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="Dirección completa"
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="rounded-xl"
              disabled={isSaving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="rounded-xl bg-blue-500 hover:bg-blue-600"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-2xl dark:bg-slate-800 dark:border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              {client && client.orders.length === 0
                ? 'Eliminar cliente permanentemente'
                : 'Desactivar cliente'}
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {client && client.orders.length === 0 ? (
                <>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {client.name}
                  </span>{' '}
                  no tiene pedidos asociados. Se eliminará permanentemente de la base de datos junto
                  con su cuenta de acceso.
                </>
              ) : (
                <>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {client?.name}
                  </span>{' '}
                  tiene {client?.orders.length} pedido{client?.orders.length !== 1 ? 's' : ''}{' '}
                  asociado{client?.orders.length !== 1 ? 's' : ''}. Se ocultará de la lista pero
                  todos sus registros se conservarán.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl"
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {client && client.orders.length === 0 ? 'Eliminando...' : 'Desactivando...'}
                </>
              ) : client && client.orders.length === 0 ? (
                'Eliminar permanentemente'
              ) : (
                'Desactivar cliente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
