'use client';

import { useState, useMemo } from 'react';

import Link from 'next/link';

import {
  Calendar,
  Download,
  Edit,
  IdCard,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  User,
} from 'lucide-react';

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
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClients } from '@/hooks/use-clients';

const ITEMS_PER_PAGE = 10;

export default function AdminClientsPage() {
  const { clients, isLoading, refetch } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    cedula: '',
    address: '',
  });

  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdClientEmail, setCreatedClientEmail] = useState<string>('');

  const handleCreateClient = async () => {
    if (!newClient.name.trim() || !newClient.email.trim() || !newClient.phone.trim()) {
      setCreateError('Por favor completa los campos requeridos');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newClient.name.trim(),
          email: newClient.email.trim(),
          phone: newClient.phone.trim(),
          cedula: newClient.cedula.trim() || null,
          address: newClient.address.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el cliente');
      }

      // Guardar la contraseña generada y el email para mostrarlos
      setCreatedPassword(data.defaultPassword);
      setCreatedClientEmail(newClient.email);

      // Limpiar formulario
      setNewClient({ name: '', email: '', phone: '', cedula: '', address: '' });

      // Refrescar lista de clientes
      refetch();
    } catch (err: any) {
      console.error('Error creating client:', err);
      setCreateError(err.message || 'Error al crear el cliente');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateError(null);
    setCreatedPassword(null);
    setCreatedClientEmail('');
    setNewClient({ name: '', email: '', phone: '', cedula: '', address: '' });
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      return (
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery)
      );
    });
  }, [clients, searchQuery]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredClients, currentPage]);

  // Resetear página cuando cambia la búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">Administra tu cartera de clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 gap-2 rounded-xl border-slate-200">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button
            className="h-10 gap-2 rounded-full bg-blue-500 px-5 hover:bg-blue-600"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-10"
        />
      </div>

      {/* Table */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Lista de Clientes</CardTitle>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
              {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold uppercase text-slate-400">Cliente</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">Contacto</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">Pedidos</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">Facturación</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">Última Actividad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && paginatedClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="group cursor-pointer border-slate-100 transition-colors hover:bg-blue-50/50"
                >
                  <TableCell className="pl-6">
                    <Link href={`/admin/clients/${client.id}`} className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-11 w-11 border-2 border-white shadow-md transition-transform group-hover:scale-105">
                          <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white">
                            {client.initials}
                          </AvatarFallback>
                        </Avatar>
                        {client.activeOrders > 0 && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-white">
                            {client.activeOrders}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600">{client.name}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/clients/${client.id}`} className="block">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {client.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {client.phone}
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/clients/${client.id}`} className="block">
                      <div>
                        <p className="font-semibold text-slate-900">{client.totalOrders}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/clients/${client.id}`} className="block">
                      <p className="font-semibold text-emerald-600">${client.totalSpent.toLocaleString()}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/clients/${client.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-600">{client.lastOrderDate}</span>
                      </div>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="mt-4 text-sm font-medium text-slate-600">Cargando clientes...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-slate-100 p-4">
                <User className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">No se encontraron clientes</p>
              <p className="mt-1 text-sm text-slate-400">
                Intenta con otra búsqueda o crea un nuevo cliente
              </p>
            </div>
          ) : null}

          {/* Paginación */}
          {!isLoading && filteredClients.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredClients.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{createdPassword ? 'Cliente Creado' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription>
              {createdPassword
                ? 'El cliente ha sido creado exitosamente con acceso al sistema'
                : 'Completa los datos del cliente'}
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {createError}
            </div>
          )}

          {createdPassword ? (
            // Vista de éxito con credenciales
            <div className="space-y-4 py-4">
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">Cliente creado exitosamente</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  El cliente ahora puede acceder al sistema con las siguientes credenciales:
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Email:</span>
                    <span className="font-mono text-sm font-medium text-slate-900">{createdClientEmail}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Contraseña temporal:</span>
                    <span className="font-mono text-sm font-bold text-blue-600">{createdPassword}</span>
                  </div>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  Comunica estas credenciales al cliente de forma segura. Se recomienda que cambie la contraseña en su primer acceso.
                </p>
              </div>
            </div>
          ) : (
            // Formulario de creación
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Nombre completo"
                  className="h-10 rounded-xl"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    className="h-10 rounded-xl"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Teléfono *</label>
                  <Input
                    type="tel"
                    placeholder="+54 9 11 1234-5678"
                    className="h-10 rounded-xl"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Cédula / DNI</label>
                <Input
                  placeholder="Ej: 27.456.789-0"
                  className="h-10 rounded-xl"
                  value={newClient.cedula}
                  onChange={(e) => setNewClient({ ...newClient, cedula: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Dirección</label>
                <Input
                  placeholder="Dirección completa"
                  className="h-10 rounded-xl"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {createdPassword ? (
              <Button
                className="rounded-xl bg-blue-500 hover:bg-blue-600"
                onClick={handleCloseCreateDialog}
              >
                Cerrar
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseCreateDialog}
                  className="rounded-xl"
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button
                  className="rounded-xl bg-blue-500 hover:bg-blue-600"
                  onClick={handleCreateClient}
                  disabled={isCreating || !newClient.name.trim() || !newClient.email.trim() || !newClient.phone.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Cliente'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
