import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { profileNeedsInviteUnlock } from '@/core/auth/profileNeedsInviteUnlock';
import { profileNeedsOnboarding } from '@/core/auth/profileNeedsOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { org } from '@/config/org';
import { AppLogo } from '@/components/branding/AppLogo';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';

export default function InviteGatePage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshProfile();
      if (!cancelled) setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
    // Refresh once on mount so OAuth unlocks are reflected before the gate renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only
  }, []);

  if (loading || refreshing) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profileNeedsInviteUnlock(profile)) {
    return <Navigate to={profileNeedsOnboarding(profile) ? '/onboarding' : '/'} replace />;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error('Enter your chapter invite code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('unlock_signup_with_invite', {
        p_code: trimmed,
      });
      if (error) throw error;
      if (!data) {
        toast.error('Invalid invite code. Ask a chapter officer for the current code.');
        return;
      }
      await refreshProfile();
      toast.success('Welcome to the chapter!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not verify invite code';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <AppLogo className="mx-auto mb-4 h-16 w-16 rounded-2xl shadow-purple" alt={`${org.shortName} logo`} />
            <h1 className="font-display text-2xl font-bold text-foreground">Chapter invite required</h1>
            <p className="text-muted-foreground mt-1">
              This app is for verified {org.shortName} members. Enter the invite code from chapter leadership.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Enter invite code</CardTitle>
              <CardDescription>
                Signed in as {user.email}. Existing members who already have accounts are not affected when the code rotates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-gate-code">Invite code</Label>
                  <Input
                    id="invite-gate-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder="Chapter invite code"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Unlock access
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="shrink-0 px-4 pb-8 pt-2">
        <AppCopyrightFooter />
      </div>
    </div>
  );
}
