import { Capacitor } from '@capacitor/core';
import { AppleSignIn, SignInScope } from '@capawesome/capacitor-apple-sign-in';
import { supabase } from '@/integrations/supabase/client';
import { syncProfileIdentityFromUser } from '@/core/auth/authIdentity';
import { resolveInviteUnlockAfterAuth } from '@/core/auth/inviteUnlock';

function randomNonce(length = 32): string {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  const values = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function canUseNativeAppleSignIn(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Native Sign in with Apple via Authentication Services.
 * Captures name/email from the credential (first authorization only) and
 * stores them so onboarding does not ask again (App Store Guideline 4).
 */
export async function signInWithNativeApple(): Promise<{
  unlock: 'unlocked' | 'locked' | 'skipped';
}> {
  const rawNonce = randomNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  const result = await AppleSignIn.signIn({
    scopes: [SignInScope.Email, SignInScope.FullName],
    nonce: hashedNonce,
  });

  if (!result.idToken) {
    throw new Error('Apple Sign In did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: result.idToken,
    nonce: rawNonce,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Apple Sign In succeeded but no user was returned.');

  const givenName = String(result.givenName ?? '').trim();
  const familyName = String(result.familyName ?? '').trim();

  await syncProfileIdentityFromUser(data.user, {
    firstName: givenName || undefined,
    lastName: familyName || undefined,
  });

  const unlock = await resolveInviteUnlockAfterAuth();
  return { unlock };
}
