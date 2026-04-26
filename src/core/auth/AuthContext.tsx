import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { org, hasPosition } from '@/config/org';
import { supabase } from '@/integrations/supabase/client';

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
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string, redirectTo: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setProfile(data as Profile);
    }
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (data) {
      setRoles(data.map(r => r.role as AppRole));
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRoles(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    
    return { error };
  };

  const requestPasswordReset = async (email: string, redirectTo: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const signOut = async () => {
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
