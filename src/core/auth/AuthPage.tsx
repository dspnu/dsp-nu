import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { profileNeedsInviteUnlock } from '@/core/auth/profileNeedsInviteUnlock';
import { profileNeedsOnboarding } from '@/core/auth/profileNeedsOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { org } from '@/config/org';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { AccountLegalNotice } from '@/components/legal/AccountLegalNotice';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AppLogo } from '@/components/branding/AppLogo';
import { PENDING_INVITE_KEY } from '@/core/auth/inviteUnlock';
import { canUseNativeAppleSignIn, signInWithNativeApple } from '@/core/auth/appleSignIn';

type LastUsedLoginMethod = 'google' | 'apple' | 'email';

const LAST_USED_LOGIN_METHOD_KEY = 'dsp:last-login-method';

export default function AuthPage() {
  const { user, loading, signIn, signUp, requestPasswordReset, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthProviderLoading, setOauthProviderLoading] = useState<'google' | 'apple' | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [lastUsedLoginMethod, setLastUsedLoginMethod] = useState<LastUsedLoginMethod | null>(null);
  const [signupInviteCode, setSignupInviteCode] = useState('');

  useEffect(() => {
    const savedMethod = window.localStorage.getItem(LAST_USED_LOGIN_METHOD_KEY);
    if (savedMethod === 'google' || savedMethod === 'apple' || savedMethod === 'email') {
      setLastUsedLoginMethod(savedMethod);
    }
  }, []);

  const persistLastUsedLoginMethod = (method: LastUsedLoginMethod) => {
    setLastUsedLoginMethod(method);
    window.localStorage.setItem(LAST_USED_LOGIN_METHOD_KEY, method);
  };

  const getRedirectUrl = () => {
    if (Capacitor.isNativePlatform()) return 'dspnu://auth/callback';
    const origin = window.location.origin.replace(/\/$/, '');
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    return isLocal ? `${origin}/auth/callback` : `https://${org.domain}/auth/callback`;
  };

  /** Same deep link as OAuth so recovery emails open the native app. */
  const getPasswordResetRedirectUrl = () => getRedirectUrl();

  const prepareInviteForOAuth = async (requireInvite?: boolean): Promise<boolean> => {
    if (!requireInvite) return true;
    const trimmed = signupInviteCode.trim();
    if (!trimmed) {
      toast.error('Enter your chapter invite code before continuing.');
      return false;
    }
    const { data: codeOk, error: codeError } = await supabase.rpc('validate_signup_invite', {
      p_code: trimmed,
    });
    if (codeError) {
      toast.error(codeError.message);
      return false;
    }
    if (!codeOk) {
      toast.error('Invalid invite code. Ask a chapter officer for the current code.');
      return false;
    }
    window.sessionStorage.setItem(PENDING_INVITE_KEY, trimmed);
    return true;
  };

  const signInWithProvider = async (provider: 'google' | 'apple', opts?: { requireInvite?: boolean }) => {
    if (!(await prepareInviteForOAuth(opts?.requireInvite))) return;

    setOauthProviderLoading(provider);
    try {
      // iOS: use Authentication Services so Apple name/email are captured and
      // not re-requested during onboarding (App Store Guideline 4).
      if (provider === 'apple' && canUseNativeAppleSignIn()) {
        const { unlock } = await signInWithNativeApple();
        persistLastUsedLoginMethod('apple');
        toast.success('Welcome!');
        setOauthProviderLoading(null);
        if (unlock === 'locked') {
          window.location.href = '/auth/invite';
        }
        return;
      }

      const redirectTo = getRedirectUrl();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(Capacitor.isNativePlatform() ? { skipBrowserRedirect: true } : {}),
          queryParams: provider === 'google'
            ? {
                access_type: 'offline',
                prompt: 'consent',
              }
            : undefined,
        },
      });

      if (error) throw error;

      persistLastUsedLoginMethod(provider);

      if (Capacitor.isNativePlatform()) {
        const url = (data as unknown as { url?: string } | null)?.url;
        if (!url) throw new Error('Missing OAuth redirect URL.');
        await Browser.open({ url, windowName: '_system' });
        setOauthProviderLoading(null);
      }
    } catch (e: unknown) {
      // User dismissed the Apple sheet — not an error worth toasting.
      const message = e instanceof Error ? e.message : 'Sign in failed';
      const cancelled =
        /1001|canceled|cancelled|error 1000/i.test(message) ||
        (typeof e === 'object' && e !== null && 'code' in e && String((e as { code: unknown }).code) === '1001');
      if (!cancelled) {
        toast.error(message);
      }
      setOauthProviderLoading(null);
    }
  };

  const oauthBusy = oauthProviderLoading !== null;

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (profileNeedsInviteUnlock(profile)) {
      return <Navigate to="/auth/invite" replace />;
    }
    return <Navigate to={profileNeedsOnboarding(profile) ? '/onboarding' : '/'} replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Persist immediately to avoid auth-navigation timing races.
    persistLastUsedLoginMethod('email');
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
    }
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const inviteCode = String(formData.get('inviteCode') ?? signupInviteCode).trim();

    const { error } = await signUp(email, password, firstName, lastName, inviteCode);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! You can now sign in.');
    }
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsResetSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('resetEmail') ?? '').trim();
    const redirectTo = getPasswordResetRedirectUrl();

    const { error } = await requestPasswordReset(email, redirectTo);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent. Check your inbox.');
      setShowForgotPassword(false);
    }

    setIsResetSubmitting(false);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <AppLogo className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-purple" alt={`${org.shortName} logo`} />
            <h1 className="font-display text-2xl font-bold text-foreground">{org.name}</h1>
            <p className="text-muted-foreground">{org.tagline}</p>
          </div>

          <Card>
            <Tabs defaultValue="signin">
              <CardHeader className="pb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="signin" className="mt-0">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'relative w-full',
                      lastUsedLoginMethod === 'google' && 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                    )}
                    onClick={() => signInWithProvider('google')}
                    disabled={oauthBusy}
                  >
                    {oauthProviderLoading === 'google' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Continue with Google
                    {lastUsedLoginMethod === 'google' && (
                      <Badge
                        variant="default"
                        className="pointer-events-none absolute -right-2 -top-2 border border-primary/40 bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm"
                      >
                        Last used
                      </Badge>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'relative w-full',
                      lastUsedLoginMethod === 'apple' && 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                    )}
                    onClick={() => signInWithProvider('apple')}
                    disabled={oauthBusy}
                  >
                    {oauthProviderLoading === 'apple' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden fill="currentColor">
                        <path d="M16.365 1.43c0 1.14-.418 2.206-1.17 3.023-.79.86-2.09 1.52-3.18 1.43-.14-1.1.4-2.25 1.14-3.06.79-.88 2.16-1.52 3.21-1.39zM20.5 17.14c-.58 1.33-.86 1.92-1.61 3.1-1.05 1.6-2.53 3.59-4.37 3.61-1.63.03-2.05-1.06-4.27-1.05-2.22.01-2.68 1.08-4.31 1.05-1.84-.03-3.25-1.82-4.3-3.41C-.08 17.7-1.1 12.6 1.2 9.2c1.12-1.66 2.9-2.71 4.55-2.71 1.7 0 2.77 1.1 4.18 1.1 1.37 0 2.2-1.11 4.2-1.11 1.5 0 3.09.82 4.2 2.24-3.7 2.03-3.1 7.31.17 8.42z" />
                      </svg>
                    )}
                    Continue with Apple
                    {lastUsedLoginMethod === 'apple' && (
                      <Badge
                        variant="default"
                        className="pointer-events-none absolute -right-2 -top-2 border border-primary/40 bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm"
                      >
                        Last used
                      </Badge>
                    )}
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div
                      className={cn(
                        'space-y-4 rounded-md',
                        lastUsedLoginMethod === 'email' && 'border border-primary/50 bg-primary/5 p-3 ring-1 ring-primary/30'
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-email">Email</Label>
                          {lastUsedLoginMethod === 'email' && (
                            <Badge
                              variant="outline"
                              className="pointer-events-none border-primary/35 bg-primary/10 text-[10px] font-semibold uppercase tracking-wide text-primary"
                            >
                              Last used
                            </Badge>
                          )}
                        </div>
                        <Input id="signin-email" name="email" type="email" required placeholder={org.auth.emailPlaceholder} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password">Password</Label>
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword((current) => !current)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {showForgotPassword ? 'Cancel password reset' : 'Forgot password?'}
                          </button>
                        </div>
                        <Input id="signin-password" name="password" type="password" required placeholder="••••••••" />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className={cn(
                        'w-full'
                      )}
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </form>
                  {showForgotPassword && (
                    <form onSubmit={handleForgotPassword} className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-password-email">Reset email</Label>
                        <Input
                          id="forgot-password-email"
                          name="resetEmail"
                          type="email"
                          required
                          placeholder={org.auth.emailPlaceholder}
                        />
                      </div>
                      <Button type="submit" variant="secondary" className="w-full" disabled={isResetSubmitting}>
                        {isResetSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-invite-code">Chapter invite code</Label>
                    <Input
                      id="signup-invite-code"
                      name="inviteCode"
                      value={signupInviteCode}
                      onChange={(e) => setSignupInviteCode(e.target.value)}
                      required
                      autoComplete="off"
                      autoCapitalize="characters"
                      placeholder="Ask a chapter officer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for new accounts. Existing members can use Sign In without a code.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => signInWithProvider('google', { requireInvite: true })}
                    disabled={oauthBusy}
                  >
                    {oauthProviderLoading === 'google' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => signInWithProvider('apple', { requireInvite: true })}
                    disabled={oauthBusy}
                  >
                    {oauthProviderLoading === 'apple' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden fill="currentColor">
                        <path d="M16.365 1.43c0 1.14-.418 2.206-1.17 3.023-.79.86-2.09 1.52-3.18 1.43-.14-1.1.4-2.25 1.14-3.06.79-.88 2.16-1.52 3.21-1.39zM20.5 17.14c-.58 1.33-.86 1.92-1.61 3.1-1.05 1.6-2.53 3.59-4.37 3.61-1.63.03-2.05-1.06-4.27-1.05-2.22.01-2.68 1.08-4.31 1.05-1.84-.03-3.25-1.82-4.3-3.41C-.08 17.7-1.1 12.6 1.2 9.2c1.12-1.66 2.9-2.71 4.55-2.71 1.7 0 2.77 1.1 4.18 1.1 1.37 0 2.2-1.11 4.2-1.11 1.5 0 3.09.82 4.2 2.24-3.7 2.03-3.1 7.31.17 8.42z" />
                      </svg>
                    )}
                    Continue with Apple
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" name="firstName" required placeholder="John" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" name="lastName" required placeholder="Doe" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" name="email" type="email" required placeholder={org.auth.emailPlaceholder} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" name="password" type="password" required minLength={6} placeholder="••••••••" />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
          </Card>
        </div>
      </div>
      <div className="shrink-0 px-4 pb-8 pt-2 border-t border-border/50 bg-background/95">
        <div className="max-w-md mx-auto w-full space-y-4">
          <AccountLegalNotice />
          <AppCopyrightFooter />
        </div>
      </div>
    </div>
  );
}
