'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/browser';
import type { Profile } from '@/lib/types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialProfile?: Profile | null;
}) {
  const [user, setUser] = useState<User | null>(null);
  // profile arranca con el valor del servidor (SSR) — disponible antes del primer render
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  // isLoading siempre empieza en false: el profile ya viene del servidor, no hay waterfall
  const [isLoading] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  const isMounted = useRef(true);

  // Función para obtener el perfil
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return null;
        }

        return data;
      } catch (error) {
        console.error('Error in fetchProfile:', error);
        return null;
      }
    },
    [supabase]
  );

  // Refrescar perfil manualmente (usado en página de perfil)
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      if (isMounted.current) {
        setProfile(profileData);
      }
    }
  }, [user, fetchProfile]);

  // Refrescar sesión manualmente (útil después del login con OAuth)
  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!isMounted.current) return;
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        if (isMounted.current) setProfile(profileData);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }, [supabase, fetchProfile]);

  // Listener de cambios de auth.
  // INITIAL_SESSION se unifica con SIGNED_IN/TOKEN_REFRESHED: todos actualizan user y profile.
  // Ya no controla isLoading porque el profile viene hydratado desde el servidor.
  useEffect(() => {
    isMounted.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted.current) return;

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        if (session?.user) {
          // Establecer el User de Supabase (tipo correcto, viene del cliente browser)
          setUser(session.user);
          // Re-fetch del profile en background para mantener datos frescos.
          // El profile ya se muestra desde initialProfile (SSR), esto solo actualiza si cambió.
          const profileData = await fetchProfile(session.user.id);
          if (isMounted.current) setProfile(profileData);
        } else {
          setUser(null);
          setProfile(null);
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted.current) {
          setUser(null);
          setProfile(null);
          // Guard mid-session: si la sesión expira mientras el usuario está en la app
          const pathname = window.location.pathname;
          if (pathname.startsWith('/admin') || pathname.startsWith('/client')) {
            router.push('/login');
          }
        }
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, router]);

  // NOTA: La protección de rutas se maneja en el middleware del servidor.
  // No hacemos redirecciones aquí para evitar loops y parpadeos.

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [supabase, router]);

  // isAdmin se computa desde profile que está disponible desde el primer render (SSR)
  const isAdmin = profile?.role === 'ADMIN';

  const value = useMemo(
    () => ({ user, profile, isLoading, isAdmin, signOut, refreshProfile, refreshSession }),
    [user, profile, isLoading, isAdmin, signOut, refreshProfile, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
