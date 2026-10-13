import { supabase } from '@/integrations/supabase/client';
import { syncProfileIdentityFromUser } from '@/core/auth/authIdentity';
import { resolveInviteUnlockAfterAuth } from '@/core/auth/inviteUnlock';
import { profileNeedsOnboarding } from '@/core/auth/profileNeedsOnboarding';

/** Where to send someone after a session is established. */
export async function resolvePostAuthDestination(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await syncProfileIdentityFromUser(data.user);
  }

  const unlock = await resolveInviteUnlockAfterAuth();
  if (unlock === 'locked') return '/auth/invite';

  const userId = data.user?.id;
  if (!userId) return '/auth';

  const { data: profile } = await supabase
    .from('profiles')
    .select('major, graduation_year, family, big, little')
    .eq('user_id', userId)
    .maybeSingle();

  return profileNeedsOnboarding(profile) ? '/onboarding' : '/';
}
