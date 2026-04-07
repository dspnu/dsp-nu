import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Clock, Check, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMemberPoints } from '@/hooks/useMembers';
import { useServiceHours } from '@/hooks/useServiceHours';
import { Progress } from '@/components/ui/progress';

const POINTS_REQUIREMENT = 7;
const SERVICE_HOURS_REQUIREMENT = 3;

export function StandingCard() {
  const { user } = useAuth();
  
  const { data: userPoints } = useMemberPoints(user?.id || '');
  const totalPoints = userPoints?.reduce((sum, p) => sum + p.points, 0) || 0;
  const pointsPct = Math.min((totalPoints / POINTS_REQUIREMENT) * 100, 100);
  
  const { data: serviceHours } = useServiceHours(user?.id);
  const verifiedHours = serviceHours?.filter(h => h.verified).reduce((sum, h) => sum + Number(h.hours), 0) || 0;
  const hoursPct = Math.min((verifiedHours / SERVICE_HOURS_REQUIREMENT) * 100, 100);
  const pendingHours = serviceHours?.filter(h => !h.verified).reduce((sum, h) => sum + Number(h.hours), 0) || 0;

  return (
    <Link to="/chapter">
      <Card className="border-border/60 hover:border-primary/20 transition-all cursor-pointer group active:scale-[0.98]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Standing</span>
          </div>

          {/* Points row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Award className="h-3 w-3" />Points
              </div>
              <span className="text-xs font-semibold tabular-nums">{totalPoints}/{POINTS_REQUIREMENT}</span>
            </div>
            <Progress value={pointsPct} className="h-1" />
          </div>

          {/* Hours row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />Service
              </div>
              {verifiedHours >= SERVICE_HOURS_REQUIREMENT ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                  <Check className="h-3 w-3" />Done
                </span>
              ) : (
                <span className="text-xs font-semibold tabular-nums">
                  {verifiedHours.toFixed(1)}/{SERVICE_HOURS_REQUIREMENT}
                  {pendingHours > 0 && (
                    <span className="text-amber-600 font-normal ml-1">+{pendingHours.toFixed(1)}</span>
                  )}
                </span>
              )}
            </div>
            <Progress value={hoursPct} className="h-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
