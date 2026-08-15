import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { org, hasPosition } from '@/config/org';
import { supabase } from '@/integrations/supabase/client';
import { isDemoMode, demoUser, demoSession, demoProfile, demoRoles } from '@/demo';

type AppRole = 'admin' | 'officer' | 'member' | 'developer' | 'exec';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  graduation_year: number | null;
  major: string | null;
  status: 'active' | 'alumni' | 'inactive' | 'new_member' | 'pnm';
  positions: string[];
  committees: string[];
  avatar_url: string | null;
  linkedin_url: string | null;
  family: string | null;
  big: string | null;
  little: string | null;
  /** False until a new account is unlocked with the chapter invite code. */
  signup_unlocked: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  isDeveloper: boolean;
  isAdminOrOfficer: boolean;
  /** Matches DB `is_admin_or_officer` for event RLS: admin/officer/exec roles or any exec position */
  canManageEvents: boolean;
  /** `exec` app role or at least one title in org.positions (chapter Resources add, etc.) */
  isExecBoard: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    inviteCode: string,
  ) => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string, redirectTo: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 400): Promise<T | null> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  console.warn('Auth data fetch failed after retries', lastErr);
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const intentionalSignOut = useRef(false);

  const fetchProfile = async (userId: string) => {
    const result = await withRetry(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    });

    if (result) {
      setProfile({
        ...(result as Profile),
        // Before migration / older rows: treat missing as unlocked so members aren't locked out.
        signup_unlocked: (result as Profile).signup_unlocked !== false,
      });
    }
    // On failure: keep previous profile instead of wiping UI
  };

  const fetchRoles = async (userId: string) => {
    const result = await withRetry(async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    });

    if (result) {
      setRoles(result.map((r) => r.role as AppRole));
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRoles(user.id);
    }
  };

  useEffect(() => {
    if (isDemoMode()) {
      setUser(demoUser);
      setSession(demoSession);
      setProfile(demoProfile as Profile);
      setRoles([...demoRoles]);
      setLoading(false);
      return;
    }

    const applySession = (next: Session | null, opts?: { clearProfile?: boolean }) => {
      setSession(next);
      setUser(next?.user ?? null);
      if (next?.user) {
        void fetchProfile(next.user.id);
        void fetchRoles(next.user.id);
      } else if (opts?.clearProfile) {
        setProfile(null);
        setRoles([]);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession) => {
        if (event === 'TOKEN_REFRESHED') {
          // Refresh blips must never wipe profile/roles
          if (nextSession?.user) {
            setSession(nextSession);
            setUser(nextSession.user);
          }
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_OUT') {
          if (intentionalSignOut.current) {
            intentionalSignOut.current = false;
            applySession(null, { clearProfile: true });
            setLoading(false);
            return;
          }
          // Transient SIGNED_OUT under load: verify before wiping the app
          void supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
              applySession(data.session);
            } else {
              // One refresh attempt before accepting logout
              void supabase.auth
                .refreshSession()
                .then(({ data: refreshed, error }) => {
                  if (!error && refreshed.session?.user) {
                    applySession(refreshed.session);
                  } else {
                    applySession(null, { clearProfile: true });
                  }
                })
                .finally(() => setLoading(false));
              return;
            }
            setLoading(false);
          });
          return;
        }

        if (nextSession?.user) {
          applySession(nextSession);
        } else if ((event as string) === 'USER_DELETED') {
          applySession(null, { clearProfile: true });
        }
        // Ignore other null-session events without clearing cached profile

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (initial?.user) {
        applySession(initial);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isDemoMode()) return { error: null };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    inviteCode: string,
  ) => {
    if (isDemoMode()) return { error: null };
    const redirectUrl = `${window.location.origin}/`;
    const trimmedCode = inviteCode.trim();

    const { data: codeOk, error: codeError } = await supabase.rpc('validate_signup_invite', {
      p_code: trimmedCode,
    });
    if (codeError) return { error: codeError };
    if (!codeOk) {
      return { error: new Error('Invalid invite code. Ask a chapter officer for the current code.') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
          invite_code: trimmedCode,
        },
      },
    });

    return { error };
  };

  const requestPasswordReset = async (email: string, redirectTo: string) => {
    if (isDemoMode()) return { error: null };
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error };
  };

  const updatePassword = async (password: string) => {
    if (isDemoMode()) return { error: null };
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const signOut = async () => {
    if (isDemoMode()) return;
    intentionalSignOut.current = true;
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const isAdmin = roles.includes('admin');
  const isOfficer = roles.includes('officer');
  const isDeveloper = roles.includes('developer');
  const isAdminOrOfficer = isAdmin || isOfficer;
  const hasChapterExecTitle = hasPosition(profile, ...org.positions);
  const isExecBoard = roles.includes('exec') || hasChapterExecTitle;
  const canManageEvents =
    isAdmin || isOfficer || roles.includes('exec') || hasChapterExecTitle;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        isAdmin,
        isOfficer,
        isDeveloper,
        isAdminOrOfficer,
        canManageEvents,
        isExecBoard,
        signIn,
        signUp,
        requestPasswordReset,
        updatePassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
