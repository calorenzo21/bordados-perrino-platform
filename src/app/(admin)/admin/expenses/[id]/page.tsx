'use client';

import { useState, useEffect, useMemo } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  DollarSign,
  Loader2,
  Receipt,
  Save,
  Trash2,
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

interface ExpenseType {
  id: string;
  name: string;
  color: string;
  isCustom?: boolean;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  typeId: string;
  typeName: string;
  typeColor: string;
  date: string;
  createdAt: string;
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Formulario de edición
  const [formData, setFormData] = useState({
    typeId: '',
    typeName: '',
    description: '',
    amount: '',
    date: '',
  });

  // Cargar gasto y tipos
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar tipos de gastos
        const { data: typesData } = await supabase
          .from('expense_types')
          .select('*')
          .order('is_system', { ascending: false })
          .order('name', { ascending: true });

        setExpenseTypes((typesData || []).map(t => ({
          id: t.id,
          name: t.name,
          color: t.color,
          isCustom: !t.is_system,
        })));

        // Cargar gasto
        const { data: expenseData, error: expenseError } = await supabase
          .from('expenses')
          .select(`
            *,
            expense_types (name, color)
          `)
          .eq('id', expenseId)
          .single();

        if (expenseError) throw expenseError;

        const loadedExpense: Expense = {
          id: expenseData.id,
          description: expenseData.description,
          amount: expenseData.amount,
          typeId: expenseData.expense_type_id,
          typeName: expenseData.expense_types?.name || '',
          typeColor: expenseData.expense_types?.color || 'bg-slate-500',
          date: expenseData.date,
          createdAt: expenseData.created_at?.split('T')[0] || '',
        };

        setExpense(loadedExpense);
        setFormData({
          typeId: loadedExpense.typeId,
          typeName: loadedExpense.typeName,
          description: loadedExpense.description,
          amount: loadedExpense.amount.toString(),
          date: loadedExpense.date,
        });
      } catch (err: any) {
        console.error('Error loading expense:', err);
        setError(err.message || 'Error al cargar el gasto');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [expenseId, supabase]);

  const handleSelectType = (type: ExpenseType) => {
    setFormData({ ...formData, typeId: type.id, typeName: type.name });
  };

  const handleSave = async () => {
    if (!formData.typeId || !formData.amount || !formData.date) return;

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          expense_type_id: formData.typeId,
          description: formData.description.trim() || formData.typeName,
          amount: parseFloat(formData.amount),
          date: formData.date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseId);

      if (updateError) throw updateError;

      // Actualizar el estado local
      const selectedType = expenseTypes.find(t => t.id === formData.typeId);
      setExpense({
        ...expense!,
        typeId: formData.typeId,
        typeName: selectedType?.name || '',
        typeColor: selectedType?.color || 'bg-slate-500',
        description: formData.description.trim() || formData.typeName,
        amount: parseFloat(formData.amount),
        date: formData.date,
      });

      router.push('/admin/expenses');
    } catch (err: any) {
      console.error('Error updating expense:', err);
      setError(err.message || 'Error al actualizar el gasto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (deleteError) throw deleteError;

      router.push('/admin/expenses');
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      setError(err.message || 'Error al eliminar el gasto');
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const selectedType = expenseTypes.find((t) => t.id === formData.typeId);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-4 text-sm text-slate-500">Cargando gasto...</p>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Receipt className="h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Gasto no encontrado</h2>
        <p className="mt-2 text-slate-500">El gasto que buscas no existe.</p>
        <Link href="/admin/expenses">
          <Button className="mt-4 rounded-xl bg-blue-500 hover:bg-blue-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Gastos
          </Button>
        </Link>
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
            <h1 className="text-2xl font-bold text-slate-900">Editar Gasto</h1>
            <p className="text-sm text-slate-500">Modifica los detalles del gasto</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
          <Link href="/admin/expenses">
            <Button variant="outline" className="h-10 gap-2 rounded-xl">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </Link>
          <Button
            className="h-10 gap-2 rounded-xl bg-blue-500 hover:bg-blue-600"
            onClick={handleSave}
            disabled={isSaving || !formData.typeId || !formData.amount}
          >
            {isSaving ? (
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
        </div>
      </div>

      {/* Formulario */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Columna izquierda - Tipo de gasto */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
            {/* Header visual */}
            <div className={`h-24 bg-gradient-to-br ${selectedType?.color || 'from-blue-500 to-blue-600'} ${!selectedType?.color ? '' : selectedType.color.replace('bg-', 'from-') + ' to-' + selectedType.color.replace('bg-', '').replace('-500', '-600')}`} />

            <CardContent className="relative px-6 pb-6">
              {/* Icono */}
              <div className={`absolute -top-8 left-6 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white shadow-lg ${selectedType?.color || 'bg-blue-500'}`}>
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
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Vista previa del tipo seleccionado */}
                {selectedType && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${selectedType.color}`}
                      >
                        <Receipt className="h-5 w-5 text-white" />
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

          {/* Información adicional */}
          <Card className="overflow-hidden rounded-2xl border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Fecha de creación:</span>
                <span>{expense.createdAt}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>¿Eliminar este gasto?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El gasto será eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 my-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${expense.typeColor}`}>
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{expense.description}</p>
                <p className="text-sm text-slate-500">{expense.typeName} • {expense.date}</p>
              </div>
              <div className="ml-auto">
                <span className="font-bold text-blue-600">-${expense.amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
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
              className="rounded-xl bg-blue-500 hover:bg-blue-600"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Gasto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
