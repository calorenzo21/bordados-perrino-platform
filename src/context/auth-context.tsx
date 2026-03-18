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

/** Aplica usuario y carga perfil; si awaitProfile es false, no bloquea (UI usable al instante). */
function applySession(
  session: Session | null,
  opts: { awaitProfile: boolean },
  ctx: {
    isMounted: React.MutableRefObject<boolean>;
    setUser: (u: User | null) => void;
    setProfile: (p: Profile | null) => void;
    fetchProfile: (id: string) => Promise<Profile | null>;
  }
): Promise<void> {
  const { isMounted, setUser, setProfile, fetchProfile } = ctx;
  if (!isMounted.current) return Promise.resolve();

  if (session?.user) {
    setUser(session.user);
    const load = fetchProfile(session.user.id).then((profileData) => {
      if (isMounted.current) setProfile(profileData);
    });
    if (opts.awaitProfile) return load;
    void load;
    return Promise.resolve();
  }

  setUser(null);
  setProfile(null);
  return Promise.resolve();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const supabase = createClient();

  const isMounted = useRef(true);

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

  const ctxRef = useMemo(() => ({ isMounted, setUser, setProfile, fetchProfile }), [fetchProfile]);

  const updateAuthState = useCallback(
    async (session: Session | null) => {
      await applySession(session, { awaitProfile: true }, ctxRef);
    },
    [ctxRef]
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      if (isMounted.current) {
        setProfile(profileData);
      }
    }
  }, [user, fetchProfile]);

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

  useEffect(() => {
    isMounted.current = true;

    const safetyTimeout = setTimeout(() => {
      if (!isMounted.current) return;
      setIsLoading((still) => {
        if (still) {
          console.warn('[Auth] Sesión tardó mucho — desbloqueando UI (revisa red / PWA)');
        }
        return false;
      });
    }, 15000);

    const clearSafety = () => clearTimeout(safetyTimeout);

    const hydrate = async () => {
      try {
        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          const { error } = await supabase.auth.getUser();
          if (!error) {
            ({
              data: { session },
            } = await supabase.auth.getSession());
          }
        }

        if (!isMounted.current) return;
        await applySession(session, { awaitProfile: false }, ctxRef);
      } catch (e) {
        console.error('[Auth] Error al hidratar sesión:', e);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          clearSafety();
        }
      }
    };

    void hydrate();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted.current) return;

      if (event === 'INITIAL_SESSION') {
        try {
          await applySession(session, { awaitProfile: false }, ctxRef);
        } catch (error) {
          console.error('[Auth] Error en INITIAL_SESSION:', error);
        } finally {
          if (isMounted.current) {
            setIsLoading(false);
            clearSafety();
          }
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await applySession(session, { awaitProfile: true }, ctxRef);
      } else if (event === 'SIGNED_OUT') {
        if (isMounted.current) {
          setUser(null);
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted.current = false;
      clearSafety();
      subscription.unsubscribe();
    };
  }, [supabase, ctxRef]);

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
