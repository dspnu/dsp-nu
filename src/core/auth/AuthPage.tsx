import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
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

type LastUsedLoginMethod = 'google' | 'apple' | 'email';

const LAST_USED_LOGIN_METHOD_KEY = 'dsp:last-login-method';

export default function AuthPage() {
  const { user, loading, signIn, signUp, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [lastUsedLoginMethod, setLastUsedLoginMethod] = useState<LastUsedLoginMethod | null>(null);

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

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    setIsGoogleLoading(true);
    try {
      const redirectTo = getRedirectUrl();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          // In Capacitor, we want the URL so we can open it in the system browser.
          // Web build keeps the normal redirect behavior.
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
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sign in failed';
      toast.error(message);
      setIsGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    // Redirect to onboarding if profile is incomplete (no major = never onboarded)
    const needsOnboarding = profile && !profile.major && !profile.graduation_year;
    return <Navigate to={needsOnboarding ? '/onboarding' : '/'} replace />;
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

    const { error } = await signUp(email, password, firstName, lastName);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! You can now sign in.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-purple">
              <span className="text-primary-foreground font-display font-bold text-2xl">{org.greekLetters}</span>
            </div>
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
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Continue with Google
                    {lastUsedLoginMethod === 'google' && (
                      <Badge
                        variant="outline"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border-primary/35 bg-primary/10 text-[10px] font-semibold uppercase tracking-wide text-primary"
                      >
                        Last used
                      </Badge>
                    )}
                  </Button>
                  {org.auth.allowApple && (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'relative w-full',
                        lastUsedLoginMethod === 'apple' && 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                      )}
                      onClick={() => signInWithProvider('apple')}
                      disabled={isGoogleLoading}
                    >
                      Continue with Apple
                      {lastUsedLoginMethod === 'apple' && (
                        <Badge
                          variant="outline"
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border-primary/35 bg-primary/10 text-[10px] font-semibold uppercase tracking-wide text-primary"
                        >
                          Last used
                        </Badge>
                      )}
                    </Button>
                  )}
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
                        <Label htmlFor="signin-password">Password</Label>
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
                </div>
              </TabsContent>
              <TabsContent value="signup" className="mt-0">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => signInWithProvider('google')}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                  {org.auth.allowApple && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => signInWithProvider('apple')}
                      disabled={isGoogleLoading}
                    >
                      Continue with Apple
                    </Button>
                  )}
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
