import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { getAuthRedirectUrl } from '@/core/auth/authRedirect';
import { resolvePostAuthDestination } from '@/core/auth/postAuthDestination';
import { PENDING_CONFIRM_EMAIL_KEY } from '@/core/auth/pendingConfirmEmail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/branding/AppLogo';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';
import { org } from '@/config/org';
import { LoadingStatus } from '@/components/a11y/LoadingStatus';

export default function ConfirmEmailPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email?.trim() ?? '';
  const [email] = useState(() => {
    if (stateEmail) {
      window.sessionStorage.setItem(PENDING_CONFIRM_EMAIL_KEY, stateEmail);
      return stateEmail;
    }
    return window.sessionStorage.getItem(PENDING_CONFIRM_EMAIL_KEY) ?? '';
  });
  const [isResending, setIsResending] = useState(false);
  const confirmed = Boolean(user?.email_confirmed_at);

  useEffect(() => {
    if (loading || !confirmed) return;

    let cancelled = false;
    void resolvePostAuthDestination().then((path) => {
      if (cancelled) return;
      window.sessionStorage.removeItem(PENDING_CONFIRM_EMAIL_KEY);
      navigate(path, { replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [confirmed, loading, navigate]);

  const handleResend = async () => {
    if (!email) {
      toast.error('Go back and create your account again so we know which email to use.');
      return;
    }
    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Confirmation email sent again.');
    }
    setIsResending(false);
  };

  if (loading || confirmed) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <LoadingStatus label={confirmed ? 'Signing you in' : 'Loading'} iconClassName="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center p-4 outline-none">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <AppLogo className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-purple" alt={`${org.shortName} logo`} />
            <h1 className="font-display text-2xl font-bold text-foreground">Confirm your email</h1>
            <p className="text-muted-foreground">One more step before your account is ready.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" aria-hidden />
                Check your inbox
              </CardTitle>
              <CardDescription>
                {email ? (
                  <>
                    We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
                  </>
                ) : (
                  'We sent a confirmation link to your email.'
                )}{' '}
                Open it to finish creating your account. After you confirm, you&apos;ll be signed in and taken through onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="button" className="w-full" onClick={() => void handleResend()} disabled={isResending || !email}>
                {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend confirmation email
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <div className="shrink-0 border-t border-border/50 py-4">
        <AppCopyrightFooter />
      </div>
    </div>
  );
}
