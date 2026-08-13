import { supabase } from '@/integrations/supabase/client';

export const PENDING_INVITE_KEY = 'dsp:pending_invite_code';

/** Apply a signup-tab invite code after OAuth, then report whether the account is unlocked. */
export async function resolveInviteUnlockAfterAuth(): Promise<'unlocked' | 'locked' | 'skipped'> {
  const pending = window.sessionStorage.getItem(PENDING_INVITE_KEY);
  if (pending) {
    window.sessionStorage.removeItem(PENDING_INVITE_KEY);
    const { data: unlocked, error } = await supabase.rpc('unlock_signup_with_invite', {
      p_code: pending,
    });
    if (error) {
      console.warn('Invite unlock after OAuth failed', error);
      return 'locked';
    }
    return unlocked ? 'unlocked' : 'locked';
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return 'skipped';

  const { data: profile } = await supabase
    .from('profiles')
    .select('signup_unlocked')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile && profile.signup_unlocked === false) {
    return 'locked';
  }

  return 'skipped';
}
