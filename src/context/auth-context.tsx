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

import { Session, User } from '@supabase/supabase-js';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Usar useMemo para evitar crear múltiples clientes
  const supabase = useMemo(() => createClient(), []);

  // Ref para evitar carreras de estado
  const isMounted = useRef(true);
  const isInitialized = useRef(false);

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

  // Función para actualizar el estado con usuario y perfil
  const updateAuthState = useCallback(
    async (session: Session | null) => {
      if (!isMounted.current) return;

      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        if (isMounted.current) {
          setProfile(profileData);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    },
    [fetchProfile]
  );

  // Refrescar perfil manualmente
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      if (isMounted.current) {
        setProfile(profileData);
      }
    }
  }, [user, fetchProfile]);

  // Refrescar sesión manualmente (útil después del login)
  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await updateAuthState(session);
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }, [supabase, updateAuthState]);

  // Inicialización y listener de cambios de auth
  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (isMounted.current) {
          await updateAuthState(session);
          if (!isInitialized.current) {
            isInitialized.current = true;
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    // Listener: debe procesar INITIAL_SESSION para cuando la sesión se restaura desde cookies
    // después de un redirect (OAuth o primera carga). Si no lo manejamos, getSession() puede
    // resolver con null y el usuario se queda en "Redirigiendo..." hasta recargar.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        await updateAuthState(session);
        if (isMounted.current && !isInitialized.current) {
          isInitialized.current = true;
          setIsLoading(false);
        }
        return;
      }
      if (!isInitialized.current) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await updateAuthState(session);
      } else if (event === 'SIGNED_OUT') {
        if (isMounted.current) {
          setUser(null);
          setProfile(null);
        }
      }
    });

    initializeAuth();

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [supabase, updateAuthState]);

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

  const isAdmin = profile?.role === 'ADMIN';

  const value = {
    user,
    profile,
    isLoading,
    isAdmin,
    signOut,
    refreshProfile,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
