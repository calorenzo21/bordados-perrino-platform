'use client';

import { Suspense, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useClients, useServiceTypes } from '@/hooks';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Loader2,
  Package,
  Plus,
  Save,
  User,
  X,
} from 'lucide-react';

import { revalidateOrders } from '@/lib/actions/revalidate';
import { createClient } from '@/lib/supabase/browser';

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
import { Switch } from '@/components/ui/switch';

interface Client {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  cedula: string;
  address?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const INITIAL_NEW_CLIENT = {
  name: '',
  email: '',
  phone: '',
  cedula: '',
  address: '',
};

// Clave para localStorage
const STORAGE_KEY = 'bordados_new_order_draft';

// Estructura del borrador guardado
interface OrderDraft {
  clientId: string | null;
  formData: {
    description: string;
    serviceType: string;
    serviceTypeId: string;
    quantity: string;
    total: string;
    dueDate: string;
    observations: string;
    isUrgent: boolean;
  };
  savedAt: string;
}

function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientParam = searchParams.get('client');
  const supabase = createClient();

  // Obtener clientes y tipos de servicio de Supabase
  const { clients, isLoading: loadingClients, refetch: refetchClients } = useClients();
  const { serviceTypes, isLoading: loadingServices } = useServiceTypes();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    serviceType: '',
    serviceTypeId: '',
    quantity: '',
    total: '',
    dueDate: '',
    observations: '',
    isUrgent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Modal crear cliente (desde nuevo pedido)
  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState(INITIAL_NEW_CLIENT);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [createClientError, setCreateClientError] = useState<string | null>(null);
  const [createdClientResult, setCreatedClientResult] = useState<{
    client: Client;
    password: string;
    email: string;
  } | null>(null);

  // Cargar borrador del localStorage al montar
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        const draft: OrderDraft = JSON.parse(savedDraft);

        // Verificar que el borrador no sea muy antiguo (24 horas)
        const savedTime = new Date(draft.savedAt).getTime();
        const now = new Date().getTime();
        const hoursSinceSaved = (now - savedTime) / (1000 * 60 * 60);

        if (hoursSinceSaved < 24) {
          // Restaurar datos del formulario
          setFormData(draft.formData);

          // Guardar el clientId para restaurarlo cuando los clientes carguen
          if (draft.clientId && !clientParam) {
            // Se restaurará en el otro useEffect cuando los clientes estén disponibles
            localStorage.setItem(STORAGE_KEY + '_clientId', draft.clientId);
          }
        } else {
          // Borrador expirado, eliminarlo
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Error loading draft:', e);
    }
    setDraftLoaded(true);
  }, [clientParam]);

  // Seleccionar cliente automáticamente (desde URL o borrador)
  useEffect(() => {
    if (clients.length > 0) {
      // Prioridad: URL param > borrador guardado
      const clientIdToSelect = clientParam || localStorage.getItem(STORAGE_KEY + '_clientId');

      if (clientIdToSelect) {
        const foundClient = clients.find((c) => c.id === clientIdToSelect);
        if (foundClient) {
          setSelectedClient(foundClient);
        }
        // Limpiar el clientId temporal
        localStorage.removeItem(STORAGE_KEY + '_clientId');
      }
    }
  }, [clientParam, clients]);

  // Guardar borrador en localStorage cuando cambian los datos
  useEffect(() => {
    // Solo guardar después de que se haya intentado cargar el borrador
    if (!draftLoaded) return;

    // Verificar si hay datos para guardar
    const hasData =
      selectedClient ||
      formData.description ||
      formData.serviceType ||
      formData.quantity ||
      formData.total ||
      formData.dueDate ||
      formData.observations ||
      formData.isUrgent;

    if (hasData) {
      const draft: OrderDraft = {
        clientId: selectedClient?.id || null,
        formData,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [selectedClient, formData, draftLoaded]);

  // Función para limpiar el borrador
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + '_clientId');
  };

  // Validar formulario
  const isFormValid = () => {
    return (
      selectedClient &&
      formData.description.trim() &&
      formData.serviceType &&
      formData.quantity &&
      parseInt(formData.quantity) > 0 &&
      formData.total &&
      parseFloat(formData.total) > 0 &&
      formData.dueDate
    );
  };

  // Generar número de orden
  const generateOrderNumber = async (): Promise<string> => {
    const { data, error } = await supabase.from('orders').select('order_number');

    if (error) throw error;

    let maxNumber = 0;
    if (data && data.length > 0) {
      // Encontrar el número más alto
      data.forEach((order) => {
        if (order.order_number) {
          const num = parseInt(order.order_number.replace('ORD-', ''));
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      });
    }

    return `ORD-${String(maxNumber + 1).padStart(3, '0')}`;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Debes iniciar sesión para crear pedidos');
        setIsSubmitting(false);
        return;
      }

      // Generar número de orden
      const orderNumber = await generateOrderNumber();

      // Debug info: Creating order with order_number, client_id, service_type

      // Crear el pedido en Supabase
      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          client_id: selectedClient!.id,
          description: formData.description.trim(),
          service_type: formData.serviceType,
          service_type_id: formData.serviceTypeId || null,
          quantity: parseInt(formData.quantity),
          total: parseFloat(formData.total),
          due_date: formData.dueDate,
          is_urgent: formData.isUrgent,
          status: 'RECIBIDO',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error de Supabase:', insertError);
        throw new Error(insertError.message || insertError.code || 'Error al insertar pedido');
      }

      // Crear entrada inicial en el historial de estados
      if (newOrder) {
        const { error: historyError } = await supabase.from('order_status_history').insert({
          order_id: newOrder.id,
          status: 'RECIBIDO',
          observations: formData.observations.trim() || 'Pedido creado',
        });

        if (historyError) {
          console.error('Error al crear historial:', historyError);
        }
      }

      // Limpiar borrador del localStorage
      clearDraft();

      // Revalidar caché del servidor
      await revalidateOrders();

      // Redirigir a la lista de pedidos
      router.push('/admin/orders');
    } catch (err: unknown) {
      console.error('Error al crear pedido:', err);
      let errorMessage = 'Error al crear el pedido';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errObj = err as { message?: string; code?: string };
        errorMessage = errObj.message || errObj.code || JSON.stringify(err);
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceTypeSelect = (serviceName: string, serviceId: string) => {
    setFormData({
      ...formData,
      serviceType: serviceName,
      serviceTypeId: serviceId,
    });
  };

  const handleOpenCreateClient = () => {
    setNewClientForm(INITIAL_NEW_CLIENT);
    setCreateClientError(null);
    setCreatedClientResult(null);
    setIsCreateClientDialogOpen(true);
  };

  const handleCloseCreateClient = () => {
    setIsCreateClientDialogOpen(false);
    setNewClientForm(INITIAL_NEW_CLIENT);
    setCreateClientError(null);
    setCreatedClientResult(null);
  };

  const handleCreateClientSubmit = async () => {
    if (!newClientForm.name.trim() || !newClientForm.email.trim() || !newClientForm.phone.trim()) {
      setCreateClientError('Nombre, email y teléfono son requeridos');
      return;
    }

    setIsCreatingClient(true);
    setCreateClientError(null);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientForm.name.trim(),
          email: newClientForm.email.trim(),
          phone: newClientForm.phone.trim(),
          cedula: newClientForm.cedula.trim() || null,
          address: newClientForm.address.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el cliente');
      }

      const clientForOrder: Client = {
        id: data.client.id,
        name: data.client.name,
        initials: getInitials(data.client.name),
        email: data.client.email,
        phone: data.client.phone,
        cedula: data.client.cedula || '',
        address: data.client.address || undefined,
      };

      setCreatedClientResult({
        client: clientForOrder,
        password: data.defaultPassword,
        email: data.client.email,
      });
      refetchClients();
    } catch (err) {
      setCreateClientError(err instanceof Error ? err.message : 'Error al crear el cliente');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleUseCreatedClient = () => {
    if (createdClientResult) {
      setSelectedClient(createdClientResult.client);
      handleCloseCreateClient();
    }
  };

  if (loadingClients || loadingServices) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nuevo Pedido</h1>
            <p className="text-sm text-slate-500">Completa los datos para crear un nuevo pedido</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl"
            onClick={() => {
              clearDraft();
              router.push('/admin/orders');
            }}
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button
            className="h-10 gap-2 rounded-xl bg-blue-500 hover:bg-blue-600"
            onClick={handleSubmit}
            disabled={isSubmitting || !isFormValid()}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? 'Guardando...' : 'Crear Pedido'}
          </Button>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Contenido principal */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Columna izquierda - Datos del cliente */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 overflow-hidden rounded-2xl border-0 pt-0 shadow-sm">
            {/* Header decorativo - sin padding superior */}
            <div className="relative -mt-6 h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
              <div className="absolute -bottom-8 left-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-lg">
                  <User className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </div>

            <CardHeader className="pb-2 pt-12">
              <CardTitle className="flex items-center gap-2 text-base">
                <span>Datos del Cliente</span>
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-600">
                  Requerido
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Selector de cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Seleccionar Cliente</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-between rounded-xl border-slate-200 px-4 text-left"
                    >
                      {selectedClient ? (
                        <div className="flex items-center gap-3">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-blue-100 text-xs text-blue-600">
                              {selectedClient.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{selectedClient.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Buscar cliente...</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-80 w-[calc(100vw-3rem)] max-w-md overflow-y-auto rounded-xl p-2">
                    {clients.map((client) => (
                      <DropdownMenuItem
                        key={client.id}
                        className="cursor-pointer rounded-lg p-3"
                        onClick={() => setSelectedClient(client)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-100">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-sm text-white">
                              {client.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-900">{client.name}</p>
                            <p className="text-xs text-slate-500">{client.email}</p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg text-blue-600 focus:bg-blue-50 focus:text-blue-700"
                      onClick={handleOpenCreateClient}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crear nuevo cliente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="h-9 w-full gap-2 rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                onClick={handleOpenCreateClient}
              >
                <Plus className="h-4 w-4" />
                Crear nuevo cliente
              </Button>

              {/* Información del cliente seleccionado */}
              {selectedClient && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-3 rounded-xl bg-slate-50 p-4 duration-300">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        {selectedClient.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900">{selectedClient.name}</p>
                      <p className="text-xs text-slate-500">
                        {selectedClient.cedula ? `C.I. ${selectedClient.cedula}` : 'Sin cédula'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-slate-700">{selectedClient.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">Teléfono:</span>
                      <span className="text-slate-700">{selectedClient.phone}</span>
                    </div>
                    {selectedClient.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-slate-400">Dirección:</span>
                        <span className="text-slate-700">{selectedClient.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!selectedClient && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                  <User className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">
                    Selecciona un cliente para continuar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha - Detalles del pedido */}
        <div className="lg:col-span-3">
          {/* Detalles del pedido */}
          <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                Detalles del Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 p-6">
              {/* Descripción */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Descripción *</label>
                <Input
                  placeholder="Ej: Bordado de logo corporativo en camisas polo"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-11 rounded-xl border-slate-200 transition-all focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Tipo de servicio y Cantidad */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Tipo de Servicio *</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 w-full justify-between rounded-xl border-slate-200"
                      >
                        {formData.serviceType || (
                          <span className="text-slate-400">Seleccionar...</span>
                        )}
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl">
                      {serviceTypes.map((type) => (
                        <DropdownMenuItem
                          key={type.id}
                          className="cursor-pointer rounded-lg"
                          onClick={() => handleServiceTypeSelect(type.name, type.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${type.color}`} />
                            {type.name}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Cantidad *</label>
                  <Input
                    type="number"
                    placeholder="0"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="h-11 rounded-xl border-slate-200"
                  />
                </div>
              </div>

              {/* Total y Fecha */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Total ($) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      $
                    </span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={formData.total}
                      onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                      className="h-11 rounded-xl border-slate-200 pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Fecha Tentativa de Entrega *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="h-11 rounded-xl border-slate-200 pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Observaciones Iniciales
                </label>
                <textarea
                  placeholder="Notas adicionales sobre el pedido, requerimientos especiales, etc."
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Toggle Urgente */}
              <div
                className={`flex items-center justify-between rounded-xl border-2 p-4 transition-all ${formData.isUrgent ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${formData.isUrgent ? 'bg-rose-100' : 'bg-slate-200'}`}
                  >
                    <AlertTriangle
                      className={`h-5 w-5 ${formData.isUrgent ? 'text-rose-600' : 'text-slate-400'}`}
                    />
                  </div>
                  <div>
                    <p
                      className={`font-medium ${formData.isUrgent ? 'text-rose-900' : 'text-slate-700'}`}
                    >
                      Pedido Urgente
                    </p>
                    <p
                      className={`text-xs ${formData.isUrgent ? 'text-rose-600' : 'text-slate-500'}`}
                    >
                      {formData.isUrgent
                        ? 'Este pedido tiene prioridad alta'
                        : 'Marcar si requiere atención prioritaria'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.isUrgent}
                  onCheckedChange={(checked) => setFormData({ ...formData, isUrgent: checked })}
                  className="data-[state=checked]:bg-rose-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Crear Cliente (desde Nuevo Pedido) */}
      <Dialog
        open={isCreateClientDialogOpen}
        onOpenChange={(open) => !open && handleCloseCreateClient()}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{createdClientResult ? 'Cliente Creado' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription>
              {createdClientResult
                ? 'El cliente ha sido creado. Puedes usarlo para este pedido y continuar.'
                : 'Completa los datos del cliente'}
            </DialogDescription>
          </DialogHeader>

          {createClientError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {createClientError}
            </div>
          )}

          {createdClientResult ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-5 w-5 shrink-0" />
                  <span className="font-semibold">Cliente creado exitosamente</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-900">{createdClientResult.email}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Contraseña temporal:</span>
                  <span className="font-mono font-semibold text-blue-600">
                    {createdClientResult.password}
                  </span>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                Comunica las credenciales al cliente de forma segura. Se recomienda que cambie la
                contraseña en su primer acceso.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Nombre *</label>
                <Input
                  placeholder="Nombre completo"
                  className="h-10 rounded-xl"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Email *</label>
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    className="h-10 rounded-xl"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Teléfono *</label>
                  <Input
                    type="tel"
                    placeholder="+54 9 11 1234-5678"
                    className="h-10 rounded-xl"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Cédula / DNI</label>
                <Input
                  placeholder="Ej: 27.456.789-0"
                  className="h-10 rounded-xl"
                  value={newClientForm.cedula}
                  onChange={(e) => setNewClientForm({ ...newClientForm, cedula: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-slate-700">Dirección</label>
                <Input
                  placeholder="Dirección completa"
                  className="h-10 rounded-xl"
                  value={newClientForm.address}
                  onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {createdClientResult ? (
              <>
                <Button variant="outline" onClick={handleCloseCreateClient} className="rounded-xl">
                  Cerrar sin usar
                </Button>
                <Button
                  className="rounded-xl bg-blue-500 hover:bg-blue-600"
                  onClick={handleUseCreatedClient}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Usar este cliente y continuar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseCreateClient} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateClientSubmit}
                  disabled={
                    isCreatingClient ||
                    !newClientForm.name.trim() ||
                    !newClientForm.email.trim() ||
                    !newClientForm.phone.trim()
                  }
                  className="rounded-xl bg-blue-500 hover:bg-blue-600"
                >
                  {isCreatingClient ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Crear Cliente
                    </>
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

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <NewOrderContent />
    </Suspense>
  );
}
