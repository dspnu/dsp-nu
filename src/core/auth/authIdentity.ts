import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type IdentityNames = {
  firstName: string;
  lastName: string;
  /** True when name came from Apple/Google (or similar) auth metadata / profile. */
  fromProvider: boolean;
};

function splitFullName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/** Extract first/last from Supabase user_metadata (Apple, Google, email signup). */
export function namesFromUserMetadata(user: User | null | undefined): IdentityNames {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;

  const given =
    String(meta.given_name ?? meta.first_name ?? meta.givenName ?? '').trim();
  const family =
    String(meta.family_name ?? meta.last_name ?? meta.familyName ?? '').trim();

  if (given || family) {
    return { firstName: given, lastName: family, fromProvider: true };
  }

  const full = String(meta.full_name ?? meta.name ?? meta.fullName ?? '').trim();
  if (full) {
    const split = splitFullName(full);
    return { ...split, fromProvider: true };
  }

  return { firstName: '', lastName: '', fromProvider: false };
}

export function isAppleAuthUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const provider = String(user.app_metadata?.provider ?? '');
  if (provider === 'apple') return true;
  return (user.identities ?? []).some((id) => id.provider === 'apple');
}

/**
 * Prefer existing profile names; otherwise use auth metadata from Apple/Google.
 * Apple Sign In must not force the user to re-enter name when it was already provided.
 */
export function resolveIdentityNames(
  user: User | null | undefined,
  profile: { first_name?: string | null; last_name?: string | null } | null | undefined,
): IdentityNames {
  const profileFirst = String(profile?.first_name ?? '').trim();
  const profileLast = String(profile?.last_name ?? '').trim();
  if (profileFirst || profileLast) {
    return {
      firstName: profileFirst,
      lastName: profileLast,
      fromProvider: isAppleAuthUser(user) || namesFromUserMetadata(user).fromProvider,
    };
  }
  return namesFromUserMetadata(user);
}

/**
 * Persist Apple/Google identity name onto auth metadata and the profiles row when missing.
 * Safe to call after every OAuth / native Apple sign-in.
 */
export async function syncProfileIdentityFromUser(
  user: User,
  overrides?: { firstName?: string; lastName?: string },
): Promise<void> {
  const fromMeta = namesFromUserMetadata(user);
  const firstName = String(overrides?.firstName ?? fromMeta.firstName).trim();
  const lastName = String(overrides?.lastName ?? fromMeta.lastName).trim();
  if (!firstName && !lastName) return;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const needsMetaUpdate =
    String(meta.first_name ?? '').trim() !== firstName ||
    String(meta.last_name ?? '').trim() !== lastName;

  if (needsMetaUpdate) {
    await supabase.auth.updateUser({
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(' '),
        given_name: firstName,
        family_name: lastName,
      },
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) return;

  const profileFirst = String(profile.first_name ?? '').trim();
  const profileLast = String(profile.last_name ?? '').trim();
  if (profileFirst && profileLast) return;

  await supabase
    .from('profiles')
    .update({
      first_name: profileFirst || firstName,
      last_name: profileLast || lastName,
    })
    .eq('user_id', user.id);
}
