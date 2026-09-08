import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { org } from '@/config/org';
import { AppLogo } from '@/components/branding/AppLogo';
import { LoadingStatus } from '@/components/a11y/LoadingStatus';
import { MfaChallengePage } from '@/core/auth/MfaChallengePage';

const MFA_BYPASS_PATHS = new Set(['/auth/reset-password']);

export function MfaGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const skip = MFA_BYPASS_PATHS.has(location.pathname);
  const accessToken = session?.access_token ?? null;
  const [checkedToken, setCheckedToken] = useState<string | null>(null);
  const [needsMfa, setNeedsMfa] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!accessToken || skip) {
      setNeedsMfa(false);
      setCheckedToken(accessToken);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      if (error) {
        setNeedsMfa(false);
        setCheckedToken(accessToken);
        return;
      }
      setNeedsMfa(data.nextLevel === 'aal2' && data.currentLevel !== 'aal2');
      setCheckedToken(accessToken);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, accessToken, skip]);

  const checking = !skip && !!accessToken && checkedToken !== accessToken;

  if (loading || checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background pt-[env(safe-area-inset-top)]">
        <div className="flex flex-col items-center gap-4">
          <AppLogo className="h-12 w-12 animate-pulse rounded-xl" alt={`${org.shortName} logo`} />
          <LoadingStatus label="Checking sign-in" iconClassName="h-6 w-6" />
        </div>
      </div>
    );
  }

  if (needsMfa) {
    return <MfaChallengePage />;
  }

  return children;
}
