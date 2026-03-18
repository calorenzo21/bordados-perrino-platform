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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const supabase = createClient();

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

  // Inicialización y listener de cambios de auth.
  // INITIAL_SESSION siempre es el primer evento que dispara Supabase al registrar el listener.
  // Lo usamos como único punto de inicialización para evitar la race condition entre
  // initializeAuth() y el handler de INITIAL_SESSION corriendo en paralelo.
  useEffect(() => {
    isMounted.current = true;
    isInitialized.current = false;

    // Safety timeout: if INITIAL_SESSION is delayed (common on PWA cold start),
    // do NOT leave user=null while the server still has a valid session — that
    // causes AdminShell to router.replace('/login') and middleware to bounce
    // back to /admin → stuck on "Redirigiendo...". Recover from local session.
    const safetyTimeout = setTimeout(() => {
      void (async () => {
        if (isInitialized.current || !isMounted.current) return;
        console.warn(
          '[Auth] INITIAL_SESSION tardó — recuperando sesión desde almacenamiento local'
        );
        try {
          let {
            data: { session },
          } = await supabase.auth.getSession();
          // Si no hay sesión en memoria/storage, getUser() fuerza validación/red
          // con el refresh token (útil al reabrir la PWA con cookies pero sin evento INITIAL_SESSION).
          if (!session && !isInitialized.current && isMounted.current) {
            await supabase.auth.getUser();
            ({
              data: { session },
            } = await supabase.auth.getSession());
          }
          if (isInitialized.current || !isMounted.current) return;
          await updateAuthState(session);
        } catch (e) {
          console.error('[Auth] Error al recuperar sesión tras timeout:', e);
        } finally {
          if (isMounted.current && !isInitialized.current) {
            isInitialized.current = true;
            setIsLoading(false);
          }
        }
      })();
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted.current) return;

      if (event === 'INITIAL_SESSION') {
        clearTimeout(safetyTimeout);
        // try/catch/finally garantiza que isLoading se pone en false sin importar qué ocurra.
        try {
          await updateAuthState(session);
        } catch (error) {
          console.error('[Auth] Error en INITIAL_SESSION:', error);
        } finally {
          if (isMounted.current) {
            isInitialized.current = true;
            setIsLoading(false);
          }
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await updateAuthState(session);
      } else if (event === 'SIGNED_OUT') {
        if (isMounted.current) {
          setUser(null);
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted.current = false;
      clearTimeout(safetyTimeout);
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
