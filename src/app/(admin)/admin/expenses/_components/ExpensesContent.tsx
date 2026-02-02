'use client';

import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  Calendar,
  Check,
  ChevronDown,
  DollarSign,
  Download,
  Edit2,
  Loader2,
  MoreHorizontal,
  Plus,
  Receipt,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';

import { revalidateExpenseTypes, revalidateExpenses } from '@/lib/actions/revalidate';
import type { Expense, ExpenseType } from '@/lib/services/expenses.server';
import { createClient } from '@/lib/supabase/browser';

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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ITEMS_PER_PAGE = 10;

interface ExpensesContentProps {
  initialExpenses: Expense[];
  initialExpenseTypes: ExpenseType[];
}

export function ExpensesContent({ initialExpenses, initialExpenseTypes }: ExpensesContentProps) {
  const router = useRouter();

  // Use server data directly - single source of truth
  const expenses = initialExpenses;
  const dbExpenseTypes = initialExpenseTypes;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('bg-slate-500');
  const [currentPage, setCurrentPage] = useState(1);

  // Estados para edición de tipos
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [editTypeColor, setEditTypeColor] = useState('');
  const [isAddingType, setIsAddingType] = useState(false);
  const [isDeletingType, setIsDeletingType] = useState<string | null>(null);
  const [isSavingType, setIsSavingType] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  // Estados para modal de crear/editar gasto
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<(typeof expenses)[0] | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    typeId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [isDeleteExpenseDialogOpen, setIsDeleteExpenseDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<(typeof expenses)[0] | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Usar tipos directamente de la DB
  const expenseTypes = dbExpenseTypes;

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

  // Filtrar gastos
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((expense) => {
        const matchesSearch =
          expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.typeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedType === 'all' || expense.typeId === selectedType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchQuery, selectedType]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExpenses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  // Resetear página cuando cambian los filtros
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  // Calcular totales (disponibles para uso futuro)
  const _totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const _thisMonthExpenses = expenses
    .filter((exp) => {
      const expDate = new Date(exp.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Contadores por tipo
  const typeCounts = expenseTypes.reduce(
    (acc, type) => {
      acc[type.id] = expenses.filter((exp) => exp.typeId === type.id).length;
      return acc;
    },
    { all: expenses.length } as Record<string, number>
  );

  // Agregar nuevo tipo de gasto
  const handleAddType = async () => {
    if (!newTypeName.trim()) return;

    setIsAddingType(true);
    setTypeError(null);

    try {
      const { error } = await supabase.from('expense_types').insert({
        name: newTypeName.trim(),
        color: newTypeColor,
        is_system: false,
      });

      if (error) throw error;

      setNewTypeName('');
      setNewTypeColor('bg-slate-500');
      // Revalidar caché del servidor
      await revalidateExpenseTypes();
      // Trigger server re-render with fresh data
      router.refresh();
    } catch (err: unknown) {
      console.error('Error adding expense type:', err);
      setTypeError(err instanceof Error ? err.message : 'Error al agregar tipo de gasto');
    } finally {
      setIsAddingType(false);
    }
  };

  // Editar tipo de gasto
  const handleStartEditType = (type: ExpenseType) => {
    setEditingTypeId(type.id);
    setEditTypeName(type.name);
    setEditTypeColor(type.color);
  };

  const handleCancelEditType = () => {
    setEditingTypeId(null);
    setEditTypeName('');
    setEditTypeColor('');
  };

  const handleSaveEditType = async () => {
    if (!editingTypeId || !editTypeName.trim()) return;

    setIsSavingType(true);
    setTypeError(null);

    try {
      const { error } = await supabase
        .from('expense_types')
        .update({
          name: editTypeName.trim(),
          color: editTypeColor,
        })
        .eq('id', editingTypeId);

      if (error) throw error;

      setEditingTypeId(null);
      setEditTypeName('');
      setEditTypeColor('');
      // Revalidar caché del servidor
      await revalidateExpenseTypes();
      // Trigger server re-render with fresh data
      router.refresh();
    } catch (err: unknown) {
      console.error('Error updating expense type:', err);
      setTypeError(err instanceof Error ? err.message : 'Error al actualizar tipo de gasto');
    } finally {
      setIsSavingType(false);
    }
  };

  // Eliminar tipo de gasto
  const handleDeleteType = async (typeId: string) => {
    // Verificar si hay gastos con este tipo
    const hasExpenses = expenses.some((exp) => exp.typeId === typeId);
    if (hasExpenses) {
      setTypeError('No se puede eliminar un tipo que tiene gastos asociados');
      return;
    }

    setIsDeletingType(typeId);
    setTypeError(null);

    try {
      const { error } = await supabase.from('expense_types').delete().eq('id', typeId);

      if (error) throw error;

      // Revalidar caché del servidor
      await revalidateExpenseTypes();
      // Trigger server re-render with fresh data
      router.refresh();
    } catch (err: unknown) {
      console.error('Error deleting expense type:', err);
      setTypeError(err instanceof Error ? err.message : 'Error al eliminar tipo de gasto');
    } finally {
      setIsDeletingType(null);
    }
  };

  // ========== FUNCIONES PARA MODAL DE GASTOS ==========

  const handleOpenCreateExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      typeId: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setExpenseError(null);
    setIsExpenseDialogOpen(true);
  };

  const handleOpenEditExpense = (expense: (typeof expenses)[0]) => {
    setEditingExpense(expense);
    setExpenseForm({
      typeId: expense.typeId,
      amount: expense.amount.toString(),
      date: expense.date,
      description: expense.description,
    });
    setExpenseError(null);
    setIsExpenseDialogOpen(true);
  };

  const handleCloseExpenseDialog = () => {
    setIsExpenseDialogOpen(false);
    setEditingExpense(null);
    setExpenseForm({
      typeId: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setExpenseError(null);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.typeId || !expenseForm.amount || !expenseForm.date) {
      setExpenseError('Tipo, monto y fecha son requeridos');
      return;
    }

    setIsSavingExpense(true);
    setExpenseError(null);

    try {
      if (editingExpense) {
        // Editar gasto existente
        const { error } = await supabase
          .from('expenses')
          .update({
            expense_type_id: expenseForm.typeId,
            amount: parseFloat(expenseForm.amount),
            date: expenseForm.date,
            description: expenseForm.description.trim() || 'Sin descripción',
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingExpense.id);

        if (error) throw error;
      } else {
        // Crear nuevo gasto
        const { error } = await supabase.from('expenses').insert({
          expense_type_id: expenseForm.typeId,
          amount: parseFloat(expenseForm.amount),
          date: expenseForm.date,
          description: expenseForm.description.trim() || 'Sin descripción',
        });

        if (error) throw error;
      }

      handleCloseExpenseDialog();
      // Revalidar caché del servidor
      await revalidateExpenses();
      // Trigger server re-render with fresh data
      router.refresh();
    } catch (err: unknown) {
      console.error('Error saving expense:', err);
      setExpenseError(err instanceof Error ? err.message : 'Error al guardar el gasto');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleOpenDeleteExpense = (expense: (typeof expenses)[0]) => {
    setExpenseToDelete(expense);
    setIsDeleteExpenseDialogOpen(true);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;

    setIsDeletingExpense(true);

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseToDelete.id);

      if (error) throw error;

      setIsDeleteExpenseDialogOpen(false);
      setExpenseToDelete(null);
      // Revalidar caché del servidor
      await revalidateExpenses();
      // Trigger server re-render with fresh data
      router.refresh();
    } catch (err: unknown) {
      console.error('Error deleting expense:', err);
    } finally {
      setIsDeletingExpense(false);
    }
  };

  // Obtener el nombre del tipo seleccionado
  const getSelectedTypeName = () => {
    const type = expenseTypes.find((t) => t.id === expenseForm.typeId);
    return type?.name || '';
  };

  // Obtener color del tipo
  const getTypeColor = (typeId: string) => {
    const type = expenseTypes.find((t) => t.id === typeId);
    return type?.color || 'bg-slate-500';
  };

  // Obtener clases del badge según el color
  const getTypeBadgeClasses = (typeId: string) => {
    const type = expenseTypes.find((t) => t.id === typeId);
    const colorMap: Record<string, string> = {
      'bg-blue-500': 'bg-blue-100 text-blue-700 border-blue-200',
      'bg-amber-500': 'bg-amber-100 text-amber-700 border-amber-200',
      'bg-pink-500': 'bg-pink-100 text-pink-700 border-pink-200',
      'bg-purple-500': 'bg-purple-100 text-purple-700 border-purple-200',
      'bg-emerald-500': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-rose-500': 'bg-rose-100 text-rose-700 border-rose-200',
      'bg-fuchsia-500': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
      'bg-violet-500': 'bg-violet-100 text-violet-700 border-violet-200',
      'bg-indigo-500': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-cyan-500': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'bg-teal-500': 'bg-teal-100 text-teal-700 border-teal-200',
      'bg-green-500': 'bg-green-100 text-green-700 border-green-200',
      'bg-lime-500': 'bg-lime-100 text-lime-700 border-lime-200',
      'bg-yellow-500': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'bg-orange-500': 'bg-orange-100 text-orange-700 border-orange-200',
      'bg-red-500': 'bg-red-100 text-red-700 border-red-200',
    };
    return colorMap[type?.color || ''] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Gastos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra y da seguimiento a todos los gastos del negocio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-xl border-slate-200"
            onClick={() => setIsTypeDialogOpen(true)}
          >
            <Settings className="h-4 w-4" />
            Tipos de Gasto
          </Button>
          <Button variant="outline" className="h-10 gap-2 rounded-xl border-slate-200">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button
            className="h-10 gap-2 rounded-full bg-blue-500 px-5 hover:bg-blue-600"
            onClick={handleOpenCreateExpense}
          >
            <Plus className="h-4 w-4" />
            Nuevo Gasto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por descripción, tipo o ID..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-10"
          />
        </div>

        {/* Type Filter */}
        <Tabs value={selectedType} onValueChange={handleTypeChange} className="w-auto">
          <TabsList className="h-10 rounded-xl bg-slate-100 p-1">
            <TabsTrigger
              value="all"
              className="rounded-lg px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Todos ({typeCounts.all})
            </TabsTrigger>
            {expenseTypes.slice(0, 4).map((type) => (
              <TabsTrigger
                key={type.id}
                value={type.id}
                className="flex items-center gap-1.5 rounded-lg px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                <div className={`h-2 w-2 rounded-full ${type.color}`} />
                {type.name} ({typeCounts[type.id] || 0})
              </TabsTrigger>
            ))}
            {expenseTypes.length > 4 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  {expenseTypes.slice(4).map((type) => (
                    <DropdownMenuItem
                      key={type.id}
                      onClick={() => handleTypeChange(type.id)}
                      className="cursor-pointer rounded-lg"
                    >
                      <div className={`mr-2 h-2 w-2 rounded-full ${type.color}`} />
                      {type.name} ({typeCounts[type.id] || 0})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Registro de Gastos</CardTitle>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
              {filteredExpenses.length} gasto{filteredExpenses.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="pl-6 text-xs font-semibold uppercase text-slate-400">
                  Descripción
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">
                  Tipo
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-slate-400">
                  Fecha
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase text-slate-400">
                  Monto
                </TableHead>
                <TableHead className="w-12 text-right pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.map((expense) => (
                <TableRow
                  key={expense.id}
                  className="group cursor-pointer border-slate-100 transition-colors hover:bg-blue-50/50"
                >
                  <TableCell className="pl-6">
                    <p className="truncate text-sm text-slate-700 max-w-[250px]">
                      {expense.description || 'Sin descripción'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge className={`border ${getTypeBadgeClasses(expense.typeId)}`}>
                      {expense.typeName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {expense.date}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-blue-600">
                      -${expense.amount.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
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
                      <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem
                          className="cursor-pointer rounded-lg"
                          onClick={() => handleOpenEditExpense(expense)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer rounded-lg text-red-600 focus:text-red-600"
                          onClick={() => handleOpenDeleteExpense(expense)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredExpenses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-slate-100 p-4">
                <Receipt className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">No se encontraron gastos</p>
              <p className="mt-1 text-sm text-slate-400">
                Intenta con otra búsqueda o registra un nuevo gasto
              </p>
              <Button
                className="mt-4 rounded-xl bg-blue-500 hover:bg-blue-600"
                onClick={handleOpenCreateExpense}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Gasto
              </Button>
            </div>
          )}

          {/* Paginación */}
          {filteredExpenses.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredExpenses.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog para gestionar tipos de gasto */}
      <Dialog
        open={isTypeDialogOpen}
        onOpenChange={(open) => {
          setIsTypeDialogOpen(open);
          if (!open) {
            setTypeError(null);
            setEditingTypeId(null);
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Tipos de Gasto</DialogTitle>
            <DialogDescription>
              Agrega, edita o elimina categorías para organizar mejor tus gastos
            </DialogDescription>
          </DialogHeader>

          {typeError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{typeError}</div>
          )}

          <div className="space-y-4 py-4">
            {/* Lista de tipos existentes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Tipos Existentes</label>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {expenseTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    {editingTypeId === type.id ? (
                      // Modo edición
                      <div className="flex flex-1 items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={`h-6 w-6 rounded-full ${editTypeColor} ring-2 ring-offset-1 ring-slate-300`}
                            />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="rounded-xl p-2">
                            <div className="flex flex-wrap gap-1.5 w-48">
                              {availableColors.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => setEditTypeColor(color)}
                                  className={`h-5 w-5 rounded-full ${color} transition-all ${
                                    editTypeColor === color
                                      ? 'ring-2 ring-offset-1 ring-slate-400 scale-110'
                                      : 'hover:scale-110'
                                  }`}
                                />
                              ))}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Input
                          value={editTypeName}
                          onChange={(e) => setEditTypeName(e.target.value)}
                          className="h-8 flex-1 rounded-lg text-sm"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEditType}
                          disabled={isSavingType || !editTypeName.trim()}
                          className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                          title="Guardar"
                        >
                          {isSavingType ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={handleCancelEditType}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      // Modo visualización
                      <>
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${type.color}`} />
                          <span className="text-sm font-medium text-slate-700">{type.name}</span>
                          {type.isCustom && (
                            <Badge variant="outline" className="text-[10px] border-slate-200">
                              Personalizado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">
                            {typeCounts[type.id] || 0} gastos
                          </span>
                          {type.isCustom && (
                            <>
                              <button
                                onClick={() => handleStartEditType(type)}
                                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
                                title="Editar tipo"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteType(type.id)}
                                disabled={isDeletingType === type.id}
                                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-blue-100 hover:text-blue-600 disabled:opacity-50"
                                title="Eliminar tipo"
                              >
                                {isDeletingType === type.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Agregar nuevo tipo */}
            <div className="space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
              <label className="text-sm font-medium text-slate-700">Agregar Nuevo Tipo</label>
              <Input
                placeholder="Ej: María (Costurera), Servicios, etc."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                className="h-10 rounded-xl"
              />
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Color</label>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTypeColor(color)}
                      className={`h-6 w-6 rounded-full ${color} transition-all ${
                        newTypeColor === color
                          ? 'ring-2 ring-offset-2 ring-slate-400'
                          : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTypeDialogOpen(false)}
              className="rounded-xl"
            >
              Cerrar
            </Button>
            <Button
              onClick={handleAddType}
              disabled={!newTypeName.trim() || isAddingType}
              className="rounded-xl bg-blue-500 hover:bg-blue-600"
            >
              {isAddingType ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Tipo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Crear/Editar Gasto */}
      <Dialog
        open={isExpenseDialogOpen}
        onOpenChange={(open) => !open && handleCloseExpenseDialog()}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}</DialogTitle>
            <DialogDescription>
              {editingExpense
                ? 'Modifica los datos del gasto'
                : 'Registra un nuevo gasto del negocio'}
            </DialogDescription>
          </DialogHeader>

          {expenseError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {expenseError}
            </div>
          )}

          <div className="grid gap-4 py-4">
            {/* Tipo de Gasto */}
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Tipo de Gasto *</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 w-full justify-between rounded-xl border-slate-200"
                  >
                    {expenseForm.typeId ? (
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-3 w-3 rounded-full ${getTypeColor(expenseForm.typeId)}`}
                        />
                        <span>{getSelectedTypeName()}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Seleccionar tipo...</span>
                    )}
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full min-w-[200px] rounded-xl">
                  {expenseTypes.map((type) => (
                    <DropdownMenuItem
                      key={type.id}
                      className="cursor-pointer rounded-lg"
                      onClick={() => setExpenseForm({ ...expenseForm, typeId: type.id })}
                    >
                      <div className={`mr-2 h-3 w-3 rounded-full ${type.color}`} />
                      {type.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Monto */}
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Monto *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="h-10 rounded-xl pl-9"
                />
              </div>
            </div>

            {/* Fecha */}
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Fecha *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="h-10 rounded-xl pl-10"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">
                Descripción
                <span className="ml-1 text-xs font-normal text-slate-400">(Opcional)</span>
              </label>
              <textarea
                placeholder="Ej: Pago quincenal, Alquiler mensual, Compra de materiales..."
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseExpenseDialog}
              className="rounded-xl"
              disabled={isSavingExpense}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveExpense}
              disabled={
                isSavingExpense || !expenseForm.typeId || !expenseForm.amount || !expenseForm.date
              }
              className="rounded-xl bg-blue-500 hover:bg-blue-600"
            >
              {isSavingExpense ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {editingExpense ? 'Guardar Cambios' : 'Registrar Gasto'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Eliminación */}
      <Dialog open={isDeleteExpenseDialogOpen} onOpenChange={setIsDeleteExpenseDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>¿Eliminar este gasto?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El gasto será eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>

          {expenseToDelete && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 my-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${getTypeColor(expenseToDelete.typeId)}`}
                >
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {expenseToDelete.description || 'Sin descripción'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {expenseToDelete.typeName} • {expenseToDelete.date}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-blue-600">
                    -${expenseToDelete.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteExpenseDialogOpen(false)}
              className="rounded-xl"
              disabled={isDeletingExpense}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDeleteExpense}
              className="rounded-xl bg-red-500 hover:bg-red-600"
              disabled={isDeletingExpense}
            >
              {isDeletingExpense ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
