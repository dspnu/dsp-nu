import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/core/auth/AuthContext';

function mondayUtc(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function nextMonday(): Date {
  const m = new Date(mondayUtc() + 'T00:00:00Z');
  m.setUTCDate(m.getUTCDate() + 7);
  return m;
}

export function useCareerCredits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['career-credits', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const week = mondayUtc();
      const [usageRes, grantsRes] = await Promise.all([
        supabase
          .from('career_credit_usage')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('week_start', week),
        supabase
          .from('career_credit_grants')
          .select('remaining, expires_at')
          .eq('user_id', user!.id)
          .gt('remaining', 0),
      ]);
      const weeklyUsed = usageRes.count ?? 0;
      const weeklyRemaining = Math.max(0, 1 - weeklyUsed);
      const now = Date.now();
      const bonusRemaining = (grantsRes.data ?? [])
        .filter(g => !g.expires_at || new Date(g.expires_at).getTime() > now)
        .reduce((s, g) => s + (g.remaining ?? 0), 0);
      return {
        weeklyRemaining,
        bonusRemaining,
        total: weeklyRemaining + bonusRemaining,
        nextReset: nextMonday(),
      };
    },
  });
}
