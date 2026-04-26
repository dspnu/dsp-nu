import { FormEvent, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/core/auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/branding/AppLogo';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';
import { org } from '@/config/org';

export default function ResetPasswordPage() {
  const { loading, session, updatePassword, signOut } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    const { error } = await updatePassword(password);
    if (error) {
      toast.error(error.message);
    } else {
      await signOut();
      toast.success('Password updated. You can now sign in with your new password.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <AppLogo className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-purple" alt={`${org.shortName} logo`} />
            <h1 className="font-display text-2xl font-bold text-foreground">Set a new password</h1>
            <p className="text-muted-foreground">Choose a secure password for your account.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reset password</CardTitle>
              <CardDescription>This link is from your password recovery email.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input id="new-password" name="password" type="password" minLength={6} required placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input id="confirm-password" name="confirmPassword" type="password" minLength={6} required placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/">Back to home</Link>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="shrink-0 border-t border-border/50 py-4">
        <AppCopyrightFooter />
      </div>
    </div>
  );
}
