import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/core/auth/AuthContext';
import { getAuthRedirectUrl } from '@/core/auth/authRedirect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/branding/AppLogo';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';
import { org } from '@/config/org';

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') ?? '').trim();

    const { error } = await requestPasswordReset(email, getAuthRedirectUrl());
    if (error) {
      toast.error(error.message);
    } else {
      setSentTo(email);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center p-4 outline-none">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <AppLogo className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-purple" alt={`${org.shortName} logo`} />
            <h1 className="font-display text-2xl font-bold text-foreground">Reset your password</h1>
            <p className="text-muted-foreground">We&apos;ll email you a link to choose a new one.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{sentTo ? 'Check your email' : 'Forgot password'}</CardTitle>
              <CardDescription>
                {sentTo
                  ? `If an account exists for ${sentTo}, a reset link is on its way. Open it to set a new password.`
                  : 'Enter the email on your account and we will send a reset link.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentTo ? (
                <div className="space-y-3">
                  <Button type="button" variant="secondary" className="w-full" onClick={() => setSentTo(null)}>
                    Use a different email
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/auth">Back to sign in</Link>
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-password-email">Email</Label>
                    <Input
                      id="forgot-password-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder={org.auth.emailPlaceholder}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send reset link
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/auth">Back to sign in</Link>
                  </Button>
                </form>
              )}
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
