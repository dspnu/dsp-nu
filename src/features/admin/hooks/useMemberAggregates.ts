import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PointsBreakdownRow = {
  user_id: string;
  category: string;
  points: number;
};

export type ServiceHoursTotalRow = {
  user_id: string;
  verified_hours: number;
  total_hours: number;
};

/** Officer aggregate — avoids downloading the full points ledger. */
export function useMemberPointsBreakdown() {
  return useQuery({
    queryKey: ['member-points-breakdown'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_member_points_breakdown');
      if (error) throw error;
      return ((data ?? []) as any[]).map((r: any) => ({
        user_id: r.user_id,
        category: r.category,
        points: Number(r.points) || 0,
      })) as PointsBreakdownRow[];
    },
    staleTime: 60_000,
  });
}

export function useServiceHoursTotals() {
  return useQuery({
    queryKey: ['service-hours-totals'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_service_hours_totals');
      if (error) throw error;
      return ((data ?? []) as any[]).map((r: any) => ({
        user_id: r.user_id,
        verified_hours: Number(r.verified_hours) || 0,
        total_hours: Number(r.total_hours) || 0,
      })) as ServiceHoursTotalRow[];
    },
    staleTime: 60_000,
  });
}

export function sumPointsForUser(rows: PointsBreakdownRow[], userId: string) {
  return rows.filter((r) => r.user_id === userId).reduce((s, r) => s + r.points, 0);
}
