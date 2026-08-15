import { supabase } from '@/integrations/supabase/client';

const HEALTH_WARN_MS = 2500;

export type HealthPingResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

/** Lightweight REST ping before opening a voting period. */
export async function pingSupabaseHealth(): Promise<HealthPingResult> {
  const start = performance.now();
  try {
    const { error } = await supabase.from('chapter_settings').select('key').limit(1);
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      return { ok: false, latencyMs, error: error.message };
    }
    return { ok: latencyMs < HEALTH_WARN_MS * 2, latencyMs };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      latencyMs,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

export function isHealthSlow(result: HealthPingResult) {
  return !result.ok || result.latencyMs >= HEALTH_WARN_MS;
}
