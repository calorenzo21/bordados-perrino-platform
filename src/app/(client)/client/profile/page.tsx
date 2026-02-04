'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  ArrowLeft,
  Check,
  CreditCard,
  Edit2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  X,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/browser';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ProfileData {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  cedula: string | null;
  address: string | null;
}

// Estilos sutiles con borde izquierdo de color
const colorStyles = {
  blue: {
    card: 'bg-white border border-slate-200/50 border-l-4 border-l-amber-400',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  emerald: {
    card: 'bg-white border border-slate-200/50 border-l-4 border-l-purple-400',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  purple: {
    card: 'bg-white border border-slate-200/50 border-l-4 border-l-emerald-400',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  amber: {
    card: 'bg-white border border-slate-200/50 border-l-4 border-l-purple-400',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
};

export default function ClientProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCedula, setEditCedula] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Get client data
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !client) {
        setError('Error al cargar el perfil');
        setLoading(false);
        return;
      }

      const profileData: ProfileData = {
        id: client.id,
        name: client.name,
        initials: client.name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
        email: client.email,
        phone: client.phone,
        cedula: client.cedula,
        address: client.address,
      };

      setProfile(profileData);
      setEditName(client.name);
      setEditPhone(client.phone);
      setEditCedula(client.cedula || '');
      setEditAddress(client.address || '');
      setEditEmail(client.email);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Check if email changed
      const emailChanged = editEmail !== profile.email;

      // Update client data
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          name: editName,
          phone: editPhone,
          cedula: editCedula || null,
          address: editAddress || null,
          email: editEmail,
        })
        .eq('id', profile.id);

      if (clientError) throw clientError;

      // Update profile table
      const nameParts = editName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: editPhone,
          email: editEmail,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // If email changed, update auth
      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({
          email: editEmail,
        });

        if (authError) {
          // Revert changes if auth update fails
          throw new Error(
            'Error al actualizar el correo. Se enviará un email de confirmación al nuevo correo.'
          );
        }

        setSuccess('Perfil actualizado. Se ha enviado un correo de confirmación a tu nuevo email.');
      } else {
        setSuccess('Perfil actualizado correctamente');
      }

      // Update local state
      setProfile({
        ...profile,
        name: editName,
        phone: editPhone,
        cedula: editCedula || null,
        address: editAddress || null,
        email: editEmail,
        initials: editName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
      });

      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!newPassword || !confirmPassword) {
      setPasswordError('Completa todos los campos');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setPasswordSaving(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        if (error.message.includes('different from the old password')) {
          setPasswordError('La nueva contraseña debe ser diferente a la anterior');
        } else {
          setPasswordError(error.message);
        }
        return;
      }

      setSuccess('Contraseña cambiada correctamente');
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError('Error al cambiar la contraseña');
    } finally {
      setPasswordSaving(false);
    }
  };

  const cancelEdit = () => {
    if (profile) {
      setEditName(profile.name);
      setEditPhone(profile.phone);
      setEditCedula(profile.cedula || '');
      setEditAddress(profile.address || '');
      setEditEmail(profile.email);
    }
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-slate-500">No se pudo cargar el perfil</p>
        <Link href="/client/panel">
          <Button className="mt-4" variant="outline">
            Volver al panel
          </Button>
        </Link>
      </div>
    );
  }

  const profileItems = [
    {
      icon: Mail,
      label: 'Correo electrónico',
      value: profile.email,
      editValue: editEmail,
      setEditValue: setEditEmail,
      color: 'blue',
      type: 'email',
    },
    {
      icon: Phone,
      label: 'Teléfono',
      value: profile.phone,
      editValue: editPhone,
      setEditValue: setEditPhone,
      color: 'emerald',
      type: 'tel',
    },
    {
      icon: CreditCard,
      label: 'Cédula / RIF',
      value: profile.cedula || 'No registrado',
      editValue: editCedula,
      setEditValue: setEditCedula,
      color: 'purple',
      type: 'text',
    },
    {
      icon: MapPin,
      label: 'Dirección',
      value: profile.address || 'No registrada',
      editValue: editAddress,
      setEditValue: setEditAddress,
      color: 'amber',
      type: 'text',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/client/panel">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl backdrop-blur-sm bg-white/50 border border-slate-200/50 hover:bg-white/80 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">Mi Perfil</h1>
        </div>

        {!isEditing ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-4 w-4" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={cancelEdit}
              disabled={saving}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="rounded-xl gap-2 bg-blue-500 hover:bg-blue-600"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm overflow-hidden">
        {/* Header con gradiente */}
        <div className="relative bg-linear-to-br from-blue-500 to-blue-600 px-6 pb-16 pt-8">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
              <AvatarFallback className="bg-white text-2xl font-bold text-blue-600">
                {profile.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Info */}
        <div className="px-6 pt-16 pb-6">
          {/* Nombre centrado */}
          <div className="text-center mb-6">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-center text-xl font-semibold max-w-xs mx-auto"
                placeholder="Tu nombre"
              />
            ) : (
              <h2 className="text-xl font-semibold text-slate-900">{profile.name}</h2>
            )}
          </div>

          {/* Campos de información */}
          <div className="space-y-3">
            {profileItems.map((item) => {
              const styles = colorStyles[item.color as keyof typeof colorStyles];
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-4 rounded-xl p-4 transition-colors shadow-sm ${styles.card}`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}
                  >
                    <item.icon className={`h-5 w-5 ${styles.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">{item.label}</p>
                    {isEditing ? (
                      <Input
                        type={item.type}
                        value={item.editValue}
                        onChange={(e) => item.setEditValue(e.target.value)}
                        className="mt-1 h-8 bg-slate-50"
                        placeholder={item.label}
                      />
                    ) : (
                      <p className="mt-0.5 text-sm font-medium text-slate-900 truncate">
                        {item.value}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cambiar contraseña */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={() => setShowPasswordDialog(true)}
            >
              <Key className="h-4 w-4" />
              Cambiar contraseña
            </Button>
          </div>
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>Ingresa tu nueva contraseña</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {passwordError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                {passwordError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nueva contraseña</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Confirmar contraseña</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordError(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={passwordSaving}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cambiar contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
