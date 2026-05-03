/** Shape needed to decide if the user must finish /onboarding */
export type ProfileOnboardingCheck = {
  major: string | null;
  graduation_year: number | null;
  family: string | null;
  big: string | null;
  little: string | null;
};

export function profileNeedsOnboarding(profile: ProfileOnboardingCheck | null | undefined): boolean {
  if (!profile) return false;
  if (!String(profile.major ?? '').trim()) return true;
  if (profile.graduation_year == null || profile.graduation_year <= 0) return true;
  if (!String(profile.family ?? '').trim()) return true;
  if (!String(profile.big ?? '').trim()) return true;
  if (!String(profile.little ?? '').trim()) return true;
  return false;
}
