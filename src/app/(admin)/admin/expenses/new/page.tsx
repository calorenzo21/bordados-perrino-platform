'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronDown,
  DollarSign,
  Loader2,
  Plus,
  Receipt,
  Save,
  User,
  X,
} from 'lucide-react';

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
import { createClient } from '@/lib/supabase/browser';

// Tipos
interface ExpenseType {
  id: string;
  name: string;
  color: string;
  isCustom?: boolean;
}

// Colores disponibles para tipos personalizados
const availableColors = [
  'bg-rose-500',
  'bg-pink-500',
  'bg-fuchsia-500',
  'bg-purple-500',
  'bg-violet-500',
  'bg-indigo-500',
  'bg-blue-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-green-500',
  'bg-lime-500',
  'bg-yellow-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-red-500',
];

export default function NewExpensePage() {
  const router = useRouter();
  const supabase = createClient();
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [formData, setFormData] = useState({
    typeId: '',
    typeName: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('bg-blue-500');

  // Cargar tipos de gastos desde Supabase
  useEffect(() => {
    const loadExpenseTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('expense_types')
          .select('*')
          .order('is_system', { ascending: false })
          .order('name', { ascending: true });

        if (error) throw error;

        setExpenseTypes((data || []).map(t => ({
          id: t.id,
          name: t.name,
          color: t.color,
          isCustom: !t.is_system,
        })));
      } catch (err) {
        console.error('Error loading expense types:', err);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    loadExpenseTypes();
  }, [supabase]);

  const handleSubmit = async () => {
    if (!formData.typeId || !formData.amount || !formData.date) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          expense_type_id: formData.typeId,
          description: formData.description.trim() || formData.typeName,
          amount: parseFloat(formData.amount),
          date: formData.date,
        });

      if (insertError) throw insertError;

      router.push('/admin/expenses');
    } catch (err: any) {
      console.error('Error creating expense:', err);
      setError(err.message || 'Error al crear el gasto');
      setIsSubmitting(false);
    }
  };

  const handleSelectType = (type: ExpenseType) => {
    setFormData({ ...formData, typeId: type.id, typeName: type.name });
  };

  const handleAddType = async () => {
    if (!newTypeName.trim()) return;

    try {
      const { data: newTypeData, error } = await supabase
        .from('expense_types')
        .insert({
          name: newTypeName.trim(),
          color: newTypeColor,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newType: ExpenseType = {
        id: newTypeData.id,
        name: newTypeData.name,
        color: newTypeData.color,
        isCustom: true,
      };

      setExpenseTypes([...expenseTypes, newType]);
      setFormData({ ...formData, typeId: newType.id, typeName: newType.name });
      setNewTypeName('');
      setNewTypeColor('bg-slate-500');
      setIsTypeDialogOpen(false);
    } catch (err: any) {
      console.error('Error creating expense type:', err);
      setError(err.message || 'Error al crear el tipo de gasto');
    }
  };

  const selectedType = expenseTypes.find((t) => t.id === formData.typeId);

  if (isLoadingTypes) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensaje de error */}
      {error && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-600">
          {error}
        </div>
      )}

      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/expenses">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl hover:bg-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nuevo Gasto</h1>
            <p className="text-sm text-slate-500">Registra un nuevo gasto del negocio</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/expenses">
            <Button variant="outline" className="h-10 gap-2 rounded-xl">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </Link>
          <Button
            className="h-10 gap-2 rounded-xl bg-blue-500 hover:bg-blue-600"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.typeId || !formData.amount}
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Guardando...' : 'Registrar Gasto'}
          </Button>
        </div>
      </div>

      {/* Formulario */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Columna izquierda - Tipo de gasto */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
            {/* Header visual */}
            <div className="h-24 bg-linear-to-br from-blue-500 to-blue-600" />

            <CardContent className="relative px-6 pb-6">
              {/* Icono */}
              <div className="absolute -top-8 left-6 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-linear-to-br from-blue-500 to-blue-600 shadow-lg">
                <Receipt className="h-7 w-7 text-white" />
              </div>

              <div className="pt-10">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Tipo de Gasto</h3>
                    <p className="text-xs text-slate-500">Requerido</p>
                  </div>
                  <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-600">
                    Requerido
                  </Badge>
                </div>

                {/* Selector de tipo */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-between rounded-xl border-slate-200 text-left"
                    >
                      {selectedType ? (
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${selectedType.color}`} />
                          <span className="font-medium">{selectedType.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Seleccionar tipo...</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[280px] rounded-xl" align="start">
                    {/* Tipos predefinidos */}
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-semibold text-slate-400">PREDEFINIDOS</p>
                    </div>
                    {expenseTypes
                      .filter((t) => !t.isCustom)
                      .map((type) => (
                        <DropdownMenuItem
                          key={type.id}
                          className="cursor-pointer rounded-lg"
                          onClick={() => handleSelectType(type)}
                        >
                          <div className={`mr-2 h-3 w-3 rounded-full ${type.color}`} />
                          {type.name}
                        </DropdownMenuItem>
                      ))}

                    {/* Tipos personalizados */}
                    {expenseTypes.some((t) => t.isCustom) && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-semibold text-slate-400">PERSONALIZADOS</p>
                        </div>
                        {expenseTypes
                          .filter((t) => t.isCustom)
                          .map((type) => (
                            <DropdownMenuItem
                              key={type.id}
                              className="cursor-pointer rounded-lg"
                              onClick={() => handleSelectType(type)}
                            >
                              <div className={`mr-2 h-3 w-3 rounded-full ${type.color}`} />
                              {type.name}
                            </DropdownMenuItem>
                          ))}
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer rounded-lg text-blue-600"
                      onClick={() => setIsTypeDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crear nuevo tipo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Vista previa del tipo seleccionado */}
                {selectedType && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${selectedType.color}`}
                      >
                        {selectedType.id === 'personal' ? (
                          <User className="h-5 w-5 text-white" />
                        ) : selectedType.id === 'castillo' ? (
                          <Building2 className="h-5 w-5 text-white" />
                        ) : (
                          <Receipt className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{selectedType.name}</p>
                        <p className="text-xs text-slate-500">
                          {selectedType.isCustom ? 'Tipo personalizado' : 'Tipo predefinido'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha - Detalles del gasto */}
        <div className="space-y-6 lg:col-span-3">
          <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                Detalles del Gasto
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 p-6">
              {/* Monto */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Monto *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">
                    $
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="h-14 rounded-xl border-slate-200 pl-8 text-2xl font-bold transition-all focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Fecha *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="h-11 rounded-xl border-slate-200 pl-10"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Descripción
                  <span className="ml-1 text-xs font-normal text-slate-400">(Opcional)</span>
                </label>
                <textarea
                  placeholder="Ej: Pago quincenal, Alquiler mensual, Compra de materiales..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Resumen */}
          {formData.typeId && formData.amount && (
            <Card className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${selectedType?.color}`}
                    >
                      <Receipt className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Registrar gasto en</p>
                      <p className="font-semibold text-slate-900">{formData.typeName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Monto total</p>
                    <p className="text-2xl font-bold text-blue-600">
                      -${parseFloat(formData.amount || '0').toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog para crear nuevo tipo */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Tipo de Gasto</DialogTitle>
            <DialogDescription>
              Crea una categoría personalizada para organizar tus gastos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nombre del tipo</label>
              <Input
                placeholder="Ej: María (Costurera), Servicios, etc."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Color</label>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTypeColor(color)}
                    className={`h-8 w-8 rounded-full ${color} transition-all ${newTypeColor === color
                        ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                        : 'hover:scale-110'
                      }`}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            {newTypeName && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-400">Vista previa</p>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${newTypeColor}`} />
                  <span className="font-medium text-slate-700">{newTypeName}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTypeDialogOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddType}
              disabled={!newTypeName.trim()}
              className="rounded-xl bg-blue-500 hover:bg-blue-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
