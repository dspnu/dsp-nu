import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';
import { resolveInviteUnlockAfterAuth } from '@/core/auth/inviteUnlock';
import { syncProfileIdentityFromUser } from '@/core/auth/authIdentity';

async function finishAuthRedirect(
  navigate: ReturnType<typeof useNavigate>,
  callbackType: string | null,
) {
  if (callbackType === 'recovery') {
    navigate('/auth/reset-password', { replace: true });
    return;
  }

  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await syncProfileIdentityFromUser(data.user);
  }

  const unlock = await resolveInviteUnlockAfterAuth();
  navigate(unlock === 'locked' ? '/auth/invite' : '/', { replace: true });
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const code = params.get('code');
      const callbackType = params.get('type') || hashParams.get('type');
      const errorDescription = params.get('error_description');
      const hashError = hashParams.get('error_description') || hashParams.get('error');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (errorDescription) {
        toast.error(decodeURIComponent(errorDescription));
        navigate('/auth', { replace: true });
        return;
      }

      if (hashError) {
        toast.error(decodeURIComponent(hashError));
        navigate('/auth', { replace: true });
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          toast.error(error.message);
          navigate('/auth', { replace: true });
          return;
        }

        await finishAuthRedirect(navigate, callbackType);
        return;
      }

      if (!code) {
        toast.error('Sign in failed: missing authorization response.');
        navigate('/auth', { replace: true });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        toast.error(error.message);
        navigate('/auth', { replace: true });
        return;
      }

      await finishAuthRedirect(navigate, callbackType);
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <div className="shrink-0 border-t border-border/50 py-4">
        <AppCopyrightFooter />
      </div>
    </div>
  );
}
