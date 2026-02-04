'use client';

import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useOrder } from '@/hooks/use-orders';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Edit3,
  IdCard,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Plus,
  Save,
  Truck,
  Upload,
  User,
  Wallet,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';

import { revalidateOrder } from '@/lib/actions/revalidate';
import { createClient } from '@/lib/supabase/browser';
import { fileToBase64, formatFileSize, uploadMultipleImages } from '@/lib/utils/image-upload';
import { OrderStatus, OrderStatusLabels, type OrderStatusType } from '@/lib/utils/status';

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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

interface _Order {
  id: string;
  client: {
    id: string;
    name: string;
    initials: string;
    email: string;
    phone: string;
    cedula: string;
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

// Estados del pedido en orden
const statusFlow: OrderStatusType[] = [
  OrderStatus.RECIBIDO,
  OrderStatus.CONFECCION,
  OrderStatus.RETIRO,
  OrderStatus.PARCIALMENTE_ENTREGADO,
  OrderStatus.ENTREGADO,
];

// Tipos de servicio disponibles
const serviceTypes = [
  'Llaveros',
  'DTF',
  'Impresión',
  'Impresión y Planchado',
  'Impresión, Planchado y Tela',
  'Sublimación',
  'Bordados',
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
    borderDark: 'border-blue-400',
    gradient: 'from-blue-500 to-blue-600',
    hex: '#3b82f6',
    hoverClasses: 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700',
  },
  [OrderStatus.CONFECCION]: {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-100',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    borderDark: 'border-amber-400',
    gradient: 'from-amber-500 to-amber-600',
    hex: '#f59e0b',
    hoverClasses: 'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700',
  },
  [OrderStatus.RETIRO]: {
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-100',
    light: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    borderDark: 'border-emerald-400',
    gradient: 'from-emerald-500 to-emerald-600',
    hex: '#10b981',
    hoverClasses: 'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700',
  },
  [OrderStatus.PARCIALMENTE_ENTREGADO]: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-100',
    light: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    borderDark: 'border-purple-400',
    gradient: 'from-purple-500 to-purple-600',
    hex: '#a855f7',
    hoverClasses: 'hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700',
  },
  [OrderStatus.ENTREGADO]: {
    bg: 'bg-sky-500',
    bgLight: 'bg-sky-100',
    light: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200',
    borderDark: 'border-sky-400',
    gradient: 'from-sky-500 to-sky-600',
    hex: '#0ea5e9',
    hoverClasses: 'hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700',
  },
  [OrderStatus.CANCELADO]: {
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-100',
    light: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    borderDark: 'border-rose-400',
    gradient: 'from-rose-500 to-rose-600',
    hex: '#f43f5e',
    hoverClasses: 'hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700',
  },
};

// Colores para cada segmento del timeline
const segmentColors = [
  'bg-blue-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-sky-500',
];

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const supabase = createClient();

  // Usar el hook para obtener datos de Supabase
  const { order, setOrder, isLoading: loading, refetch: _refetch } = useOrder(orderId);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    description: '',
    total: '',
    dueDate: '',
    serviceType: '',
    quantity: '',
    isUrgent: false,
  });
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [newStatusData, setNewStatusData] = useState({
    status: '' as OrderStatusType,
    observations: '',
    photos: [] as string[],
  });
  // Estados para fotos del cambio de estado
  const [statusPhotoFiles, setStatusPhotoFiles] = useState<File[]>([]);
  const [statusPhotoPreviews, setStatusPhotoPreviews] = useState<string[]>([]);
  const statusPhotoInputRef = useRef<HTMLInputElement>(null);

  // Estado para abonos
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [newPaymentData, setNewPaymentData] = useState({
    amount: '',
    method: 'efectivo' as Payment['method'],
    notes: '',
    photos: [] as string[],
  });
  const [paymentError, setPaymentError] = useState('');
  // Estados para fotos del abono
  const [paymentPhotoFiles, setPaymentPhotoFiles] = useState<File[]>([]);
  const [paymentPhotoPreviews, setPaymentPhotoPreviews] = useState<string[]>([]);
  const paymentPhotoInputRef = useRef<HTMLInputElement>(null);
  // Estado para galería de imágenes
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Inicializar editData cuando se cargue el pedido
  useEffect(() => {
    if (order) {
      setEditData({
        description: order.description,
        total: order.total.toString(),
        dueDate: order.dueDate,
        serviceType: order.serviceType,
        quantity: order.quantity.toString(),
        isUrgent: order.isUrgent,
      });
    }
  }, [order]);

  // Funciones para la galería
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

  // Calcular totales de pagos
  const totalPaid = order?.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remainingBalance = order ? order.total - totalPaid : 0;
  const paymentProgress = order ? (totalPaid / order.total) * 100 : 0;

  // Función para agregar un nuevo abono
  const handleAddPayment = async () => {
    if (!order) return;

    const amount = parseFloat(newPaymentData.amount);

    // Validaciones
    if (isNaN(amount) || amount <= 0) {
      setPaymentError('Ingresa un monto válido mayor a 0');
      return;
    }

    // Si por alguna razón el monto es mayor al restante, ajustar automáticamente
    const finalAmount = amount > remainingBalance ? remainingBalance : amount;

    setIsSavingPayment(true);
    setPaymentError('');

    try {
      // 0. Obtener el usuario actual y su nombre
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      let userName = 'Admin';
      if (currentUser?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', currentUser.id)
          .single();

        if (profileData) {
          userName =
            `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Admin';
        }
      }

      // 1. Subir fotos a Supabase Storage (si hay)
      let uploadedPhotoUrls: string[] = [];
      if (paymentPhotoFiles.length > 0) {
        const uploadResults = await uploadMultipleImages(
          paymentPhotoFiles,
          'payment-receipts',
          `orders/${order.uuid}`,
          { maxSizeKB: 500, quality: 0.8 }
        );
        uploadedPhotoUrls = uploadResults.map((r) => r.url);
      }

      // 2. Insertar el pago en Supabase (con received_by)
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.uuid,
          amount: finalAmount,
          method: newPaymentData.method.toLowerCase(),
          notes: newPaymentData.notes || null,
          received_by: currentUser?.id || null,
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error al crear pago:', paymentError);
        throw new Error(paymentError.message);
      }

      // 3. Guardar las URLs de las fotos en la tabla payment_photos
      if (uploadedPhotoUrls.length > 0 && paymentData) {
        const photosToInsert = uploadedPhotoUrls.map((url) => ({
          payment_id: paymentData.id,
          photo_url: url,
        }));

        const { error: photosError } = await supabase.from('payment_photos').insert(photosToInsert);

        if (photosError) {
          console.error('Error al guardar fotos del pago:', photosError);
        }
      }

      // 4. Actualizar estado local
      const newPayment: Payment = {
        id: paymentData?.id || `PAY-${Date.now()}`,
        amount: finalAmount,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        method: newPaymentData.method,
        notes: newPaymentData.notes || 'Sin observaciones',
        photos: uploadedPhotoUrls,
        user: userName,
      };

      setOrder({
        ...order,
        payments: [...order.payments, newPayment],
      });

      // Revalidar caché del servidor
      await revalidateOrder(order.uuid);

      // 5. Resetear el formulario y cerrar
      setNewPaymentData({ amount: '', method: 'efectivo', notes: '', photos: [] });
      setPaymentPhotoFiles([]);
      setPaymentPhotoPreviews([]);
      setIsPaymentDialogOpen(false);
    } catch (err) {
      console.error('Error al agregar abono:', err);
      setPaymentError(err instanceof Error ? err.message : 'Error al registrar el abono');
    } finally {
      setIsSavingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-4 text-sm text-slate-500">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Package className="h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Pedido no encontrado</h2>
        <p className="mt-2 text-slate-500">El pedido {orderId} no existe.</p>
        <Link href="/admin/orders">
          <Button className="mt-4 rounded-xl bg-blue-500 hover:bg-blue-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Pedidos
          </Button>
        </Link>
      </div>
    );
  }

  // Contar entregas parciales en el historial
  const partialDeliveryCount = order.statusHistory.filter(
    (h) => h.status === OrderStatus.PARCIALMENTE_ENTREGADO
  ).length;

  // Determinar si mostrar "Parcialmente Entregado" en el timeline:
  // - Mostrar si el estado actual es PARCIALMENTE_ENTREGADO
  // - Mostrar si hay entregas parciales en el historial
  // - Mostrar si el estado actual es anterior a ENTREGADO (para permitir la opción)
  // - NO mostrar si ya está ENTREGADO y no hubo entregas parciales
  const showPartialDeliveryInTimeline =
    order.status === OrderStatus.PARCIALMENTE_ENTREGADO ||
    partialDeliveryCount > 0 ||
    (order.status !== OrderStatus.ENTREGADO && order.status !== OrderStatus.CANCELADO);

  // Crear el flujo de estados dinámico
  const dynamicStatusFlow: OrderStatusType[] = showPartialDeliveryInTimeline
    ? statusFlow
    : statusFlow.filter((s) => s !== OrderStatus.PARCIALMENTE_ENTREGADO);

  // Colores dinámicos para los segmentos
  const dynamicSegmentColors = showPartialDeliveryInTimeline
    ? segmentColors
    : segmentColors.filter((_, i) => i !== 3); // Quitar el color púrpura (índice 3)

  const currentStatusIndex = dynamicStatusFlow.indexOf(order.status as OrderStatusType);

  const handleSaveChanges = async () => {
    if (!order) return;

    setIsSavingEdit(true);

    try {
      // Actualizar en Supabase
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          description: editData.description.trim(),
          service_type: editData.serviceType,
          quantity: parseInt(editData.quantity),
          total: parseFloat(editData.total),
          due_date: editData.dueDate,
          is_urgent: editData.isUrgent,
        })
        .eq('id', order.uuid);

      if (updateError) {
        console.error('Error al actualizar pedido:', updateError);
        throw new Error(updateError.message);
      }

      // Actualizar estado local
      setOrder({
        ...order,
        description: editData.description,
        total: parseFloat(editData.total),
        dueDate: editData.dueDate,
        serviceType: editData.serviceType,
        quantity: parseInt(editData.quantity),
        isUrgent: editData.isUrgent,
      });

      // Revalidar caché del servidor
      await revalidateOrder(order.uuid);

      setIsEditing(false);
    } catch (err) {
      console.error('Error al guardar cambios:', err);
      alert(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStatusChange = (newStatus: OrderStatusType) => {
    setNewStatusData({ ...newStatusData, status: newStatus });
    setIsStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!order || !newStatusData.status || !newStatusData.observations) return;

    setIsStatusChanging(true);

    try {
      // 0. Obtener el usuario actual
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      // Obtener el nombre del usuario desde el perfil
      let userName = 'Admin';
      if (currentUser?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', currentUser.id)
          .single();

        if (profileData) {
          userName =
            `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Admin';
        }
      }

      // 1. Subir fotos a Supabase Storage (si hay)
      let uploadedPhotoUrls: string[] = [];
      if (statusPhotoFiles.length > 0) {
        const uploadResults = await uploadMultipleImages(
          statusPhotoFiles,
          'status-photos',
          `orders/${order.uuid}`,
          { maxSizeKB: 500, quality: 0.8 }
        );
        uploadedPhotoUrls = uploadResults.map((r) => r.url);
      }

      // 2. Actualizar el estado del pedido en la tabla orders
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatusData.status })
        .eq('id', order.uuid);

      if (updateError) {
        console.error('Error al actualizar estado:', updateError);
        throw new Error(updateError.message);
      }

      // 3. Insertar el nuevo registro en el historial de estados (con changed_by)
      const { data: historyData, error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: order.uuid,
          status: newStatusData.status,
          observations: newStatusData.observations,
          changed_by: currentUser?.id || null,
        })
        .select()
        .single();

      if (historyError) {
        console.error('Error al crear historial:', historyError);
        throw new Error(historyError.message);
      }

      // 4. Guardar las URLs de las fotos en la tabla order_status_photos
      if (uploadedPhotoUrls.length > 0 && historyData) {
        const photosToInsert = uploadedPhotoUrls.map((url) => ({
          status_history_id: historyData.id,
          photo_url: url,
        }));

        const { error: photosError } = await supabase
          .from('order_status_photos')
          .insert(photosToInsert);

        if (photosError) {
          console.error('Error al guardar fotos:', photosError);
          // No lanzamos error aquí para no interrumpir el flujo
        }
      }

      // 5. Actualizar el estado local inmediatamente
      const newHistoryItem: StatusHistoryItem = {
        id: historyData?.id || Date.now().toString(),
        status: newStatusData.status,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        observations: newStatusData.observations,
        photos: uploadedPhotoUrls,
        user: userName,
      };

      setOrder({
        ...order,
        status: newStatusData.status,
        statusHistory: [...order.statusHistory, newHistoryItem],
      });

      // Revalidar caché del servidor
      await revalidateOrder(order.uuid);

      // 6. Limpiar y cerrar
      setNewStatusData({ status: '' as OrderStatusType, observations: '', photos: [] });
      setStatusPhotoFiles([]);
      setStatusPhotoPreviews([]);
      setIsStatusDialogOpen(false);
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      alert(err instanceof Error ? err.message : 'Error al cambiar el estado');
    } finally {
      setIsStatusChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">Pedido {order.id}</h1>
              <Badge
                className={`${statusColors[order.status as OrderStatusType].light} ${statusColors[order.status as OrderStatusType].text} ${statusColors[order.status as OrderStatusType].border} border`}
              >
                {OrderStatusLabels[order.status as OrderStatusType]}
              </Badge>
              {order.isUrgent && (
                <Badge className="flex items-center gap-1 border-rose-200 bg-rose-100 text-rose-700">
                  <AlertTriangle className="h-3 w-3" />
                  URGENTE
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">Creado el {order.createdAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-xl"
                onClick={() => setIsEditing(false)}
                disabled={isSavingEdit}
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                className="h-10 gap-2 rounded-xl bg-blue-500 hover:bg-blue-600"
                onClick={handleSaveChanges}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="h-4 w-4" />
              Editar Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Timeline de Progreso Interactivo */}
      <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">
          {/* Texto explicativo */}

          <div className="relative">
            {/* Segmentos de progreso con gaps */}
            <div className="absolute left-6 right-6 top-6 flex gap-1">
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
            <TooltipProvider delayDuration={200}>
              <div className="relative flex justify-between">
                {dynamicStatusFlow.map((status, index) => {
                  const Icon = statusIcons[status];
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const isFuture = index > currentStatusIndex;
                  const colors = statusColors[status];
                  // Si es ENTREGADO y es el estado actual, mostrarlo como completado
                  const isEntregadoFinal = status === OrderStatus.ENTREGADO && isCurrent;
                  const showAsCompleted = (isCompleted && !isCurrent) || isEntregadoFinal;

                  // Lógica especial para PARCIALMENTE_ENTREGADO:
                  // - Es clickeable si es futuro (para primera entrega parcial)
                  // - Es clickeable si es el estado actual (para agregar más entregas parciales)
                  const isParcialmenteEntregadoAndCurrent =
                    status === OrderStatus.PARCIALMENTE_ENTREGADO &&
                    order.status === OrderStatus.PARCIALMENTE_ENTREGADO;

                  // Determinar si es clickeable
                  const isClickable = isFuture || isParcialmenteEntregadoAndCurrent;

                  // Tooltip personalizado para PARCIALMENTE_ENTREGADO cuando es el estado actual
                  const tooltipText = isParcialmenteEntregadoAndCurrent
                    ? 'Click para agregar otra entrega parcial'
                    : 'Click para cambiar estado';

                  const StatusButton = (
                    <button
                      type="button"
                      onClick={() => isClickable && handleStatusChange(status)}
                      disabled={!isClickable}
                      className={`group relative z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                        showAsCompleted
                          ? `bg-linear-to-br ${colors.gradient} shadow-lg`
                          : isCurrent
                            ? `${colors.bgLight} border-2 ${colors.borderDark} ${isParcialmenteEntregadoAndCurrent ? 'cursor-pointer hover:scale-110 hover:shadow-lg' : ''}`
                            : isClickable
                              ? 'border-2 border-slate-200 bg-white cursor-pointer hover:border-slate-300 hover:bg-slate-50 hover:scale-110 hover:shadow-lg hover:shadow-slate-200/50'
                              : 'border-2 border-slate-200 bg-white'
                      }`}
                    >
                      {showAsCompleted ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <Icon
                          className={`h-5 w-5 transition-colors duration-300 ${
                            isCurrent
                              ? colors.text
                              : isClickable
                                ? `text-slate-300 group-hover:${colors.text}`
                                : 'text-slate-300'
                          }`}
                        />
                      )}

                      {/* Efecto de pulso solo si es el estado actual y NO es entregado */}
                      {isCurrent && !isEntregadoFinal && (
                        <span
                          className={`absolute inset-0 animate-ping rounded-full ${colors.bgLight} opacity-50`}
                        />
                      )}

                      {/* Indicador de clickeable - aparece en hover */}
                      {isClickable && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-110">
                          <span className={`h-2.5 w-2.5 rounded-full ${colors.bg}`} />
                        </span>
                      )}
                    </button>
                  );

                  return (
                    <div key={status} className="flex flex-col items-center">
                      {/* Círculo del paso - Interactivo con Tooltip */}
                      {isClickable ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{StatusButton}</TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={8}
                            className={`${colors.bg} border-0 px-3 py-2 text-white shadow-lg`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">{tooltipText}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        StatusButton
                      )}

                      {/* Etiqueta y fecha */}
                      <div className="mt-3 text-center">
                        <p
                          className={`text-sm font-medium transition-colors duration-300 ${
                            isCompleted || isCurrent
                              ? 'text-slate-900'
                              : isClickable
                                ? 'text-slate-400'
                                : 'text-slate-400'
                          }`}
                        >
                          {OrderStatusLabels[status]}
                        </p>
                        {order.statusHistory.find((h) => h.status === status) && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {order.statusHistory.find((h) => h.status === status)?.date}
                            {status === OrderStatus.PARCIALMENTE_ENTREGADO &&
                              partialDeliveryCount > 1 && (
                                <span className="ml-1 text-purple-500">
                                  ({partialDeliveryCount})
                                </span>
                              )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          </div>

          {/* Indicador de entregas parciales si aplica */}
          {partialDeliveryCount > 0 && (
            <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border-2 border-purple-200 bg-purple-50 p-4">
              <PackageCheck className="h-5 w-5 text-purple-600" />
              <div className="text-center">
                <p className="text-sm font-semibold text-purple-900">
                  {partialDeliveryCount} entrega{partialDeliveryCount > 1 ? 's' : ''} parcial
                  {partialDeliveryCount > 1 ? 'es' : ''} registrada
                  {partialDeliveryCount > 1 ? 's' : ''}
                </p>
                <p className="mt-1 text-xs text-purple-600">
                  Revisa el historial para ver los detalles
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contenido Principal */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Columna Izquierda - Cliente (Solo lectura) */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden rounded-2xl border-0 shadow-sm pt-0">
            {/* Header decorativo con gradiente */}
            <div className="relative h-28 bg-linear-to-br from-blue-500 via-blue-600 to-indigo-700">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2RvdHMpIi8+PC9zdmc+')] opacity-50" />
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <Avatar className="h-20 w-20 border-4 border-white shadow-xl">
                  <AvatarFallback className="bg-linear-to-br from-blue-600 to-indigo-600 text-xl font-bold text-white">
                    {order.client.initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <CardContent className="pt-14 text-center">
              <h3 className="text-lg font-semibold text-slate-900">{order.client.name}</h3>

              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-700">{order.client.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                    <IdCard className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Cédula / DNI</p>
                    <p className="text-sm font-medium text-slate-700">
                      {order.client.cedula || '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                    <Phone className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Teléfono</p>
                    <p className="text-sm font-medium text-slate-700">{order.client.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                    <MapPin className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Dirección</p>
                    <p className="text-sm font-medium text-slate-700">
                      {order.client.address || 'Sin dirección registrada'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link href={`/admin/clients/${order.client.id}`}>
                  <Button variant="outline" className="w-full rounded-xl">
                    <User className="mr-2 h-4 w-4" />
                    Ver Perfil del Cliente
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha - Detalles y Timeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-slate-100 p-1">
              <TabsTrigger
                value="details"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Detalles del Pedido
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <DollarSign className="mr-1.5 h-4 w-4" />
                Abonos
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Historial de Estados
              </TabsTrigger>
            </TabsList>

            {/* Tab: Detalles */}
            <TabsContent value="details" className="mt-4 space-y-4">
              {/* Estado del tiempo */}
              <Card
                className={`rounded-2xl border-0 shadow-sm ${order.isDelayed ? 'bg-linear-to-r from-rose-50 to-rose-100' : 'bg-linear-to-r from-emerald-50 to-emerald-100'}`}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    {order.isDelayed ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div>
                      <p
                        className={`font-medium ${order.isDelayed ? 'text-rose-700' : 'text-emerald-700'}`}
                      >
                        {order.isDelayed ? 'Pedido con Retraso' : 'Pedido en Tiempo'}
                      </p>
                      <p
                        className={`text-sm ${order.isDelayed ? 'text-rose-600' : 'text-emerald-600'}`}
                      >
                        {order.isDelayed
                          ? `${Math.abs(order.daysRemaining)} días de retraso`
                          : order.status === OrderStatus.ENTREGADO
                            ? 'Entregado exitosamente'
                            : `${order.daysRemaining} días restantes para entrega`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Fecha de entrega</p>
                    <p
                      className={`font-semibold ${order.isDelayed ? 'text-rose-600' : 'text-emerald-600'}`}
                    >
                      {order.dueDate}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Detalles del pedido */}
              <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-blue-500" />
                    Información del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 p-6">
                  {/* Descripción */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-500">Descripción</label>
                    {isEditing ? (
                      <Input
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="h-11 rounded-xl"
                      />
                    ) : (
                      <p className="rounded-xl bg-slate-50 p-3 text-slate-700">
                        {order.description}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Tipo de servicio */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">Tipo de Servicio</label>
                      {isEditing ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-11 w-full justify-between rounded-xl border-slate-200"
                            >
                              {editData.serviceType || (
                                <span className="text-slate-400">Seleccionar...</span>
                              )}
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="rounded-xl">
                            {serviceTypes.map((type) => (
                              <DropdownMenuItem
                                key={type}
                                className="cursor-pointer rounded-lg"
                                onClick={() => setEditData({ ...editData, serviceType: type })}
                              >
                                {type}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <div className="flex h-11 items-center rounded-xl bg-slate-50 px-3">
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-white text-slate-600"
                          >
                            {order.serviceType}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Cantidad */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">Cantidad</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="1"
                          placeholder="0"
                          value={editData.quantity}
                          onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
                          className="h-11 rounded-xl border-slate-200"
                        />
                      ) : (
                        <div className="flex h-11 items-center rounded-xl bg-slate-50 px-3 font-semibold text-slate-700">
                          {order.quantity} unidades
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Total (Editable) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">Total</label>
                      {isEditing ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            $
                          </span>
                          <Input
                            type="number"
                            value={editData.total}
                            onChange={(e) => setEditData({ ...editData, total: e.target.value })}
                            className="h-11 rounded-xl pl-7"
                          />
                        </div>
                      ) : (
                        <div className="flex h-11 items-center rounded-xl bg-slate-50 px-3 text-xl font-semibold text-emerald-700">
                          ${order.total.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Fecha de entrega (Editable) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-500">Fecha de Entrega</label>
                      {isEditing ? (
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            type="date"
                            value={editData.dueDate}
                            onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                            className="h-11 rounded-xl pl-10"
                          />
                        </div>
                      ) : (
                        <div className="flex h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 font-medium text-slate-700">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {order.dueDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Toggle Urgente */}
                  <div
                    className={`mt-5 flex items-center justify-between rounded-xl border-2 p-4 transition-all ${(isEditing && editData.isUrgent) || (!isEditing && order.isUrgent) ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${(isEditing && editData.isUrgent) || (!isEditing && order.isUrgent) ? 'bg-rose-100' : 'bg-slate-200'}`}
                      >
                        <AlertTriangle
                          className={`h-5 w-5 ${(isEditing && editData.isUrgent) || (!isEditing && order.isUrgent) ? 'text-rose-600' : 'text-slate-400'}`}
                        />
                      </div>
                      <div>
                        <p
                          className={`font-medium ${(isEditing && editData.isUrgent) || (!isEditing && order.isUrgent) ? 'text-rose-900' : 'text-slate-700'}`}
                        >
                          Pedido Urgente
                        </p>
                        <p
                          className={`text-xs ${(isEditing && editData.isUrgent) || (!isEditing && order.isUrgent) ? 'text-rose-600' : 'text-slate-500'}`}
                        >
                          {(isEditing && editData.isUrgent) || (!isEditing && order.isUrgent)
                            ? 'Este pedido tiene prioridad alta'
                            : 'Marcar si requiere atención prioritaria'}
                        </p>
                      </div>
                    </div>
                    {isEditing ? (
                      <Switch
                        checked={editData.isUrgent}
                        onCheckedChange={(checked) =>
                          setEditData({ ...editData, isUrgent: checked })
                        }
                        className="data-[state=checked]:bg-rose-500"
                      />
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${order.isUrgent ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'}`}
                      >
                        {order.isUrgent ? 'Sí' : 'No'}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Abonos */}
            <TabsContent value="payments" className="mt-4 space-y-4">
              {/* Resumen de Pagos */}
              <Card className="overflow-hidden rounded-2xl border-0 shadow-sm bg-linear-to-r from-emerald-50 to-teal-50">
                <CardHeader className="border-b border-slate-100 bg-linear-to-r from-emerald-50 to-teal-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      Resumen de Pagos
                    </CardTitle>
                    <Button
                      onClick={() => setIsPaymentDialogOpen(true)}
                      disabled={remainingBalance <= 0}
                      className="h-9 gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Abono
                    </Button>
                  </div>
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
                    <div className="rounded-2xl bg-linear-to-r from-slate-50 to-slate-100 p-5 shadow-md border border-slate-200">
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
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20`}
                        >
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
                  {remainingBalance <= 0 && (
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-100 p-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="font-medium text-emerald-700">
                        Pedido pagado en su totalidad
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
                        No hay abonos registrados
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Agrega el primer abono para este pedido
                      </p>
                      <Button
                        onClick={() => setIsPaymentDialogOpen(true)}
                        className="mt-4 gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar Primer Abono
                      </Button>
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
                                        Observaciones
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
                                          <button
                                            key={photoIndex}
                                            type="button"
                                            onClick={() => openGallery(payment.photos, photoIndex)}
                                            className="group relative h-14 w-14 overflow-hidden rounded-lg bg-slate-100 transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                          >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                              src={photo}
                                              alt={`Comprobante ${photoIndex + 1}`}
                                              className="h-full w-full object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/40">
                                              <ZoomIn className="h-4 w-4 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Usuario que registró */}
                                  <div className="mt-3 flex items-center gap-2 border-t border-emerald-200/50 pt-3">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="bg-emerald-200 text-xs text-emerald-700">
                                        {payment.user.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-slate-500">
                                      Registrado por <strong>{payment.user}</strong>
                                    </span>
                                  </div>
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
                    Historial de Cambios de Estado
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
                          const colors = statusColors[item.status as OrderStatusType];
                          const Icon = statusIcons[item.status as OrderStatusType];

                          return (
                            <div
                              key={item.id}
                              className="relative pl-16"
                              style={{
                                animationDelay: `${index * 100}ms`,
                              }}
                            >
                              {/* Icono del estado */}
                              <div
                                className={`absolute left-0 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${colors.gradient} shadow-lg`}
                              >
                                <Icon className="h-5 w-5 text-white" />
                              </div>

                              {/* Contenido */}
                              <div
                                className={`rounded-2xl border ${colors.border} ${colors.light} p-4 transition-all duration-300 hover:shadow-md`}
                              >
                                {/* Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <Badge className={`${colors.bg} border-0 text-white`}>
                                    {OrderStatusLabels[item.status as OrderStatusType]}
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
                                      Observaciones
                                    </p>
                                    <p className="mt-1 text-sm text-slate-700">
                                      {item.observations}
                                    </p>
                                  </div>
                                )}

                                {/* Fotos */}
                                {item.photos.length > 0 && (
                                  <div className="mt-4">
                                    <p className="mb-2 text-xs font-medium uppercase text-slate-400">
                                      Fotos Adjuntas ({item.photos.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {item.photos.map((photo, photoIndex) => (
                                        <button
                                          key={photoIndex}
                                          type="button"
                                          onClick={() => openGallery(item.photos, photoIndex)}
                                          className="group relative h-16 w-16 overflow-hidden rounded-lg bg-slate-100 transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={photo}
                                            alt={`Foto ${photoIndex + 1}`}
                                            className="h-full w-full object-cover"
                                          />
                                          {/* Overlay con icono de zoom */}
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/40">
                                            <ZoomIn className="h-5 w-5 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Usuario que hizo el cambio */}
                                <div className="mt-3 flex items-center gap-2 border-t border-slate-200/50 pt-3">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-slate-200 text-xs">
                                      {item.user.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-slate-500">
                                    Actualizado por <strong>{item.user}</strong>
                                  </span>
                                </div>
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

      {/* Dialog para cambiar estado */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Cambiar Estado a{' '}
              {newStatusData.status && (
                <Badge className={`${statusColors[newStatusData.status]?.bg} border-0 text-white`}>
                  {OrderStatusLabels[newStatusData.status]}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Añade observaciones y fotos para documentar este cambio de estado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Observaciones */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Observaciones <span className="text-rose-500">*</span>
              </label>
              <textarea
                placeholder="Describe el progreso o cualquier detalle importante..."
                value={newStatusData.observations}
                onChange={(e) =>
                  setNewStatusData({ ...newStatusData, observations: e.target.value })
                }
                rows={4}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Subir fotos */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Fotos del Progreso</label>
              <input
                ref={statusPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;

                  // Agregar archivos
                  setStatusPhotoFiles((prev) => [...prev, ...files]);

                  // Generar previews
                  for (const file of files) {
                    const preview = await fileToBase64(file);
                    setStatusPhotoPreviews((prev) => [...prev, preview]);
                  }

                  // Limpiar input
                  e.target.value = '';
                }}
              />

              {/* Zona de drop/click */}
              <div
                onClick={() => statusPhotoInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');

                  const files = Array.from(e.dataTransfer.files).filter((f) =>
                    f.type.startsWith('image/')
                  );
                  if (files.length === 0) return;

                  setStatusPhotoFiles((prev) => [...prev, ...files]);

                  for (const file of files) {
                    const preview = await fileToBase64(file);
                    setStatusPhotoPreviews((prev) => [...prev, preview]);
                  }
                }}
                className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-6 text-center transition-colors hover:border-blue-300 hover:bg-blue-50/50"
              >
                <Upload className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">Arrastra fotos o haz clic para subir</p>
                <p className="mt-1 text-xs text-slate-400">
                  PNG, JPG hasta 10MB (se comprimirán automáticamente)
                </p>
              </div>

              {/* Preview de fotos seleccionadas */}
              {statusPhotoPreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {statusPhotoPreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square overflow-hidden rounded-lg"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusPhotoFiles((prev) => prev.filter((_, i) => i !== index));
                            setStatusPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center text-[10px] text-white">
                        {formatFileSize(statusPhotoFiles[index]?.size || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsStatusDialogOpen(false);
                setStatusPhotoFiles([]);
                setStatusPhotoPreviews([]);
                setNewStatusData({ status: '' as OrderStatusType, observations: '', photos: [] });
              }}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={!newStatusData.observations || isStatusChanging}
              className="rounded-xl bg-blue-500 hover:bg-blue-600"
            >
              {isStatusChanging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Confirmar Cambio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Galería de Imágenes */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-4xl border-0 bg-black/95 p-0 sm:rounded-2xl">
          {/* Título oculto para accesibilidad */}
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

      {/* Dialog para agregar abono */}
      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          if (isSavingPayment) return; // No cerrar mientras se guarda
          setIsPaymentDialogOpen(open);
          if (!open) {
            setPaymentError('');
            setNewPaymentData({ amount: '', method: 'efectivo', notes: '', photos: [] });
            setPaymentPhotoFiles([]);
            setPaymentPhotoPreviews([]);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Registrar Nuevo Abono
            </DialogTitle>
            <DialogDescription>
              Ingresa los detalles del abono. El saldo restante es de{' '}
              <strong className="text-amber-600">${remainingBalance.toLocaleString()}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Monto */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Monto del Abono <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  min="1"
                  max={remainingBalance}
                  value={newPaymentData.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = parseFloat(value);
                    // Auto-ajustar si el monto es mayor al restante
                    if (!isNaN(numValue) && numValue > remainingBalance) {
                      setNewPaymentData({ ...newPaymentData, amount: remainingBalance.toString() });
                    } else {
                      setNewPaymentData({ ...newPaymentData, amount: value });
                    }
                    setPaymentError('');
                  }}
                  className="h-12 rounded-xl pl-8 text-lg font-semibold"
                />
              </div>
              {paymentError && (
                <p className="flex items-center gap-1.5 text-sm text-rose-500">
                  <AlertCircle className="h-4 w-4" />
                  {paymentError}
                </p>
              )}
              {/* Botón de pagar todo */}
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNewPaymentData({ ...newPaymentData, amount: remainingBalance.toString() })
                  }
                  className="h-8 rounded-lg text-xs bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                >
                  Pagar todo (${remainingBalance.toLocaleString()})
                </Button>
              </div>
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Método de Pago <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => {
                  const isSelected = newPaymentData.method === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() =>
                        setNewPaymentData({
                          ...newPaymentData,
                          method: method.id as Payment['method'],
                        })
                      }
                      className={`flex items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <method.icon
                        className={`h-5 w-5 ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`}
                      />
                      <span className="text-sm font-medium">{method.label}</span>
                      {isSelected && <Check className="ml-auto h-4 w-4 text-emerald-500" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Observaciones <span className="text-slate-400">(opcional)</span>
              </label>
              <textarea
                placeholder="Ej: Seña inicial, pago parcial, pago final..."
                value={newPaymentData.notes}
                onChange={(e) => setNewPaymentData({ ...newPaymentData, notes: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Comprobantes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Comprobantes <span className="text-slate-400">(opcional)</span>
              </label>

              <input
                ref={paymentPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;

                  setPaymentPhotoFiles((prev) => [...prev, ...files]);

                  for (const file of files) {
                    const preview = await fileToBase64(file);
                    setPaymentPhotoPreviews((prev) => [...prev, preview]);
                  }

                  e.target.value = '';
                }}
              />

              {/* Vista previa de imágenes */}
              {paymentPhotoPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {paymentPhotoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={`Comprobante ${index + 1}`}
                        className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentPhotoFiles((prev) => prev.filter((_, i) => i !== index));
                          setPaymentPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
                        }}
                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center text-[8px] text-white rounded-b-lg">
                        {formatFileSize(paymentPhotoFiles[index]?.size || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón para agregar imagen */}
              <div
                className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer"
                onClick={() => paymentPhotoInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-emerald-400', 'bg-emerald-50');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-emerald-400', 'bg-emerald-50');
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-emerald-400', 'bg-emerald-50');

                  const files = Array.from(e.dataTransfer.files).filter((f) =>
                    f.type.startsWith('image/')
                  );
                  if (files.length === 0) return;

                  setPaymentPhotoFiles((prev) => [...prev, ...files]);

                  for (const file of files) {
                    const preview = await fileToBase64(file);
                    setPaymentPhotoPreviews((prev) => [...prev, preview]);
                  }
                }}
              >
                <ImagePlus className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-1 text-sm text-slate-600">
                  Click o arrastra para agregar comprobante
                </p>
                <p className="text-xs text-slate-400">PNG, JPG hasta 10MB (se comprimirán)</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false);
                setPaymentPhotoFiles([]);
                setPaymentPhotoPreviews([]);
                setNewPaymentData({ amount: '', method: 'efectivo', notes: '', photos: [] });
                setPaymentError('');
              }}
              disabled={isSavingPayment}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={!newPaymentData.amount || isSavingPayment}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600"
            >
              {isSavingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Abono
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
