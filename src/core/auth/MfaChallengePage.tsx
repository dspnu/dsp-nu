import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';
import { org } from '@/config/org';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AppLogo } from '@/components/branding/AppLogo';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';

export function MfaChallengePage() {
  const { signOut, refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingFactor, setLoadingFactor] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (listError) {
        setError(listError.message);
        setLoadingFactor(false);
        return;
      }
      const totp = data.totp[0];
      if (!totp) {
        setError('No authenticator is set up on this account.');
        setLoadingFactor(false);
        return;
      }
      setFactorId(totp.id);
      setLoadingFactor(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const verify = async (nextCode: string) => {
    if (!factorId || nextCode.length !== 6 || submitting) return;
    setSubmitting(true);
    setError('');
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: nextCode,
    });
    if (verifyError) {
      setError(verifyError.message);
      setCode('');
      setSubmitting(false);
      return;
    }
    await refreshProfile();
    toast.success('Authenticator verified.');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center p-4 outline-none">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <AppLogo className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-purple" alt={`${org.shortName} logo`} />
            <h1 className="font-display text-2xl font-bold text-foreground">{org.name}</h1>
            <p className="text-muted-foreground">Two-step verification</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Authenticator code</CardTitle>
              <CardDescription>
                Open your authenticator app and enter the 6-digit code for {org.shortName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingFactor ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void verify(code);
                  }}
                >
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={(value) => {
                        const digits = value.replace(/\D/g, '').slice(0, 6);
                        setCode(digits);
                        if (digits.length === 6) void verify(digits);
                      }}
                      disabled={submitting || !factorId}
                      autoFocus
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && <p className="text-sm text-destructive text-center">{error}</p>}
                  <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                  </Button>
                </form>
              )}
              <Button type="button" variant="ghost" className="w-full" onClick={() => void signOut()}>
                Sign out
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
