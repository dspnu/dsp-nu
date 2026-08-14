/** True when the app is built/run with static screenshot data (no live Supabase). */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}
