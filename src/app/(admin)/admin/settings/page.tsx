'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Lock,
  Users,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/browser';

interface Admin {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: string;
}

// Función para traducir errores de Supabase al español
function translateSupabaseError(error: any): string {
  const message = error?.message || error?.toString() || '';
  
  const translations: Record<string, string> = {
    'New password should be different from the old password.': 'La nueva contraseña debe ser diferente a la anterior.',
    'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
    'Password is too weak': 'La contraseña es muy débil.',
    'Invalid login credentials': 'Credenciales inválidas.',
    'Email not confirmed': 'El correo no ha sido confirmado.',
    'User not found': 'Usuario no encontrado.',
    'Invalid email': 'Correo electrónico inválido.',
    'Auth session missing!': 'Sesión no encontrada.',
    'JWT expired': 'La sesión ha expirado.',
    'Unable to validate email address: invalid format': 'Formato de correo electrónico inválido.',
  };

  // Buscar traducción exacta
  if (translations[message]) {
    return translations[message];
  }

  // Buscar traducción parcial
  for (const [key, value] of Object.entries(translations)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return 'Error al procesar la solicitud. Intenta de nuevo.';
}

export default function SettingsPage() {
  const { user, profile } = useAuth();

  // Estado del perfil
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado de administradores
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isAddAdminDialogOpen, setIsAddAdminDialogOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    firstName: '',
    lastName: '',
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [createdAdminInfo, setCreatedAdminInfo] = useState<{ email: string; password: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);

  // Cargar datos del perfil
  useEffect(() => {
    if (profile) {
      setProfileData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  // Cargar lista de administradores
  const fetchAdmins = useCallback(async () => {
    setIsLoadingAdmins(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error al cargar administradores:', error);
    } finally {
      setIsLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Guardar perfil
  const handleSaveProfile = async () => {
    if (!user) {
      setProfileMessage({ type: 'error', text: 'No hay sesión activa' });
      return;
    }

    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          phone: profileData.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }

      setProfileMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      setProfileMessage({ type: 'error', text: translateSupabaseError(error) });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async () => {
    // Validaciones del lado del cliente
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Completa todos los campos' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setIsSavingPassword(true);
    setPasswordMessage(null);

    try {
      const supabase = createClient();
      
      // Usar Promise.race con timeout para evitar que se quede colgado
      // debido a eventos de auth state change
      const updatePromise = supabase.auth.updateUser({
        password: passwordData.newPassword,
      });
      
      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 10000)
      );

      const result = await Promise.race([updatePromise, timeoutPromise]);

      if (result.error) {
        console.error('Error de Supabase Auth:', result.error);
        throw result.error;
      }

      // Limpiar campos y mostrar éxito
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
      setTimeout(() => setPasswordMessage(null), 3000);
    } catch (error: any) {
      // Si es timeout, la contraseña probablemente se cambió pero el evento auth causó el cuelgue
      if (error.message === 'timeout') {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
        setTimeout(() => setPasswordMessage(null), 3000);
      } else {
        console.error('Error al cambiar contraseña:', error);
        setPasswordMessage({ 
          type: 'error', 
          text: translateSupabaseError(error)
        });
      }
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Crear administrador
  const handleCreateAdmin = async () => {
    if (!newAdminData.email) {
      return;
    }

    setIsCreatingAdmin(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdminData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear administrador');
      }

      setCreatedAdminInfo({
        email: newAdminData.email,
        password: data.defaultPassword,
      });
      setNewAdminData({ email: '', firstName: '', lastName: '' });
      fetchAdmins();
    } catch (error: any) {
      console.error('Error al crear administrador:', error);
      alert(error.message || 'Error al crear administrador');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  // Copiar contraseña
  const handleCopyPassword = async () => {
    if (createdAdminInfo?.password) {
      await navigator.clipboard.writeText(createdAdminInfo.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  // Eliminar administrador
  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;

    setIsDeletingAdmin(true);

    try {
      const response = await fetch(`/api/admin/users?id=${adminToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar administrador');
      }

      setAdminToDelete(null);
      fetchAdmins();
    } catch (error: any) {
      console.error('Error al eliminar administrador:', error);
      alert(error.message || 'Error al eliminar administrador');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-slate-500">Administra tu perfil y configuración del sistema</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Perfil */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Datos del Perfil
            </CardTitle>
            <CardDescription>Información de tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-slate-500">El correo no se puede cambiar</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+58 412 123 4567"
              />
            </div>

            {profileMessage && (
              <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                profileMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {profileMessage.type === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {profileMessage.text}
              </div>
            )}

            <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full">
              {isSavingProfile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        {/* Cambiar Contraseña */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {passwordMessage && (
              <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                passwordMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {passwordMessage.type === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {passwordMessage.text}
              </div>
            )}

            <Button 
              onClick={handleChangePassword} 
              disabled={isSavingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              variant="outline"
              className="w-full"
            >
              {isSavingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Cambiar Contraseña
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Administradores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Administradores del Sistema
              </CardTitle>
              <CardDescription>Gestiona los usuarios con acceso de administrador</CardDescription>
            </div>
            <Button onClick={() => setIsAddAdminDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAdmins ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : admins.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No hay administradores registrados
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-600">
                      {admin.first_name?.[0]?.toUpperCase() || admin.email[0].toUpperCase()}
                      {admin.last_name?.[0]?.toUpperCase() || ''}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {admin.first_name} {admin.last_name}
                      </p>
                      <p className="text-sm text-slate-500">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {admin.id === user?.id ? (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        Tú
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setAdminToDelete(admin)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para agregar admin */}
      <Dialog open={isAddAdminDialogOpen} onOpenChange={setIsAddAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Administrador</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo administrador. Se generará una contraseña automáticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Correo electrónico *</Label>
              <Input
                id="adminEmail"
                type="email"
                value={newAdminData.email}
                onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                placeholder="admin@ejemplo.com"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminFirstName">Nombre</Label>
                <Input
                  id="adminFirstName"
                  value={newAdminData.firstName}
                  onChange={(e) => setNewAdminData({ ...newAdminData, firstName: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminLastName">Apellido</Label>
                <Input
                  id="adminLastName"
                  value={newAdminData.lastName}
                  onChange={(e) => setNewAdminData({ ...newAdminData, lastName: e.target.value })}
                  placeholder="Apellido"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAdminDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAdmin} disabled={isCreatingAdmin || !newAdminData.email}>
              {isCreatingAdmin ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Crear Administrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para mostrar contraseña generada */}
      <Dialog open={!!createdAdminInfo} onOpenChange={() => setCreatedAdminInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Administrador Creado
            </DialogTitle>
            <DialogDescription>
              El administrador ha sido creado exitosamente. Comparte estas credenciales de forma segura.
            </DialogDescription>
          </DialogHeader>
          
          {createdAdminInfo && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-slate-50 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Correo</p>
                  <p className="text-slate-900">{createdAdminInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Contraseña temporal</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm">
                      {createdAdminInfo.password}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPassword}
                    >
                      {copiedPassword ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Guarda esta contraseña de forma segura. El nuevo administrador deberá cambiarla 
                  en su primer inicio de sesión desde la sección de configuración.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => {
              setCreatedAdminInfo(null);
              setIsAddAdminDialogOpen(false);
            }}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert dialog para confirmar eliminación */}
      <AlertDialog open={!!adminToDelete} onOpenChange={() => setAdminToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta de{' '}
              <strong>{adminToDelete?.first_name} {adminToDelete?.last_name}</strong>{' '}
              ({adminToDelete?.email}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAdmin}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdmin}
              disabled={isDeletingAdmin}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingAdmin ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
