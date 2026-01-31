'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

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
import { OrderStatus, type OrderStatusType } from '@/lib/utils/status';
import { useClient } from '@/hooks/use-clients';


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

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const { client, isLoading: loading, refetch } = useClient(clientId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-4 text-sm text-slate-500">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <User className="h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Cliente no encontrado</h2>
        <p className="mt-2 text-slate-500">El cliente {clientId} no existe.</p>
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
  const serviceTypeStats = client.orders.reduce((acc, order) => {
    acc[order.serviceType] = (acc[order.serviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostUsedService = Object.entries(serviceTypeStats).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/clients">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
              <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                {client.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                Cliente desde {new Date(client.createdAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long' })}
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
              <DropdownMenuItem className="rounded-lg">
                <Mail className="mr-2 h-4 w-4" />
                Enviar Email
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Phone className="mr-2 h-4 w-4" />
                Llamar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-lg text-rose-600">
                Eliminar Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Métricas principales - Estilo Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Pedidos Totales"
          value={client.totalOrders.toString()}
          description={`${client.activeOrders} activos actualmente`}
          icon={ShoppingBag}
          trend={client.activeOrders > 0 ? { value: client.activeOrders, isPositive: true } : undefined}
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
        />
      </div>

      {/* Información de contacto */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-24">
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-100/70 px-4 py-3 sm:col-span-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-200">
            <Mail className="h-4 w-4 text-blue-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase text-blue-500">Email</p>
            <p className="truncate text-sm font-medium text-slate-800">{client.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-100/70 px-4 py-3 sm:col-span-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200">
            <IdCard className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase text-amber-500">Cédula / DNI</p>
            <p className="truncate text-sm font-medium text-slate-800">{client.cedula || '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-100/70 px-4 py-3 sm:col-span-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-200">
            <Phone className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase text-emerald-500">Teléfono</p>
            <p className="truncate text-sm font-medium text-slate-800">{client.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-100/70 px-4 py-3 sm:col-span-11">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-200">
            <MapPin className="h-4 w-4 text-purple-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase text-purple-500">Dirección</p>
            <p className="truncate text-sm font-medium text-slate-800">{client.address || 'Sin dirección registrada'}</p>
          </div>
        </div>
      </div>

      {/* Historial de Pedidos */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
              Historial de Pedidos
            </CardTitle>
            <p className="mt-1 text-sm text-slate-500">{client.orders.length} pedido{client.orders.length !== 1 ? 's' : ''} en total</p>
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
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold uppercase text-slate-400">Pedido</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">Descripción</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">Servicio</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">Estado</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">Fecha</TableHead>
                <TableHead className="pr-6 text-right text-xs font-semibold uppercase text-slate-400">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="group cursor-pointer border-slate-100 transition-colors hover:bg-blue-50/50"
                >
                  <TableCell className="pl-6">
                    <Link href={`/admin/orders/${order.id}`} className="block">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${getStatusColor(order.status as OrderStatusType)} shadow-sm`}>
                          <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-600">{order.id}</p>
                          <p className="text-xs text-slate-400">{order.quantity} unidades</p>
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/orders/${order.id}`} className="block max-w-[200px]">
                      <p className="truncate text-sm text-slate-700">{order.description}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                      {order.serviceType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status as OrderStatusType} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {order.date}
                    </div>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <p className="text-sm font-semibold text-emerald-600">${order.total.toLocaleString()}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {client.orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-600">Sin pedidos aún</p>
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
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) setEditError(null);
        setIsEditDialogOpen(open);
      }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Datos del Cliente</DialogTitle>
            <DialogDescription>Actualiza la información de contacto de {client.name}</DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {editError}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nombre Completo</label>
              <Input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="h-10 rounded-xl"
                placeholder="Nombre del cliente"
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                className="h-10 rounded-xl"
                placeholder="email@ejemplo.com"
                disabled={isSaving}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Cédula / DNI</label>
                <Input
                  value={editData.cedula}
                  onChange={(e) => setEditData({ ...editData, cedula: e.target.value })}
                  className="h-10 rounded-xl"
                  placeholder="Ej: 27.456.789-0"
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="h-10 rounded-xl"
                  placeholder="+54 9 11 1234-5678"
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                className="h-10 rounded-xl"
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
    </div>
  );
}
