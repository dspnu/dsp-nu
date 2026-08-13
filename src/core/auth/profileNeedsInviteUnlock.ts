/** True when a signed-in user still needs a valid chapter invite code. */
export function profileNeedsInviteUnlock(
  profile: { signup_unlocked?: boolean | null } | null | undefined,
): boolean {
  if (!profile) return false;
  return profile.signup_unlocked === false;
}
