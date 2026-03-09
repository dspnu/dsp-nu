import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMemberPoints } from '@/hooks/useMembers';
import { useServiceHours } from '@/hooks/useServiceHours';
import { StatusBadge } from '@/components/ui/status-badge';

export function StandingCard() {
  const { user, profile } = useAuth();
  
  const { data: userPoints } = useMemberPoints(user?.id || '');
  const totalPoints = userPoints?.reduce((sum, p) => sum + p.points, 0) || 0;
  
  const { data: serviceHours } = useServiceHours(user?.id);
  const SERVICE_HOURS_REQUIREMENT = 3;
  const verifiedServiceHours = serviceHours?.filter(h => h.verified).reduce((sum, h) => sum + Number(h.hours), 0) || 0;
  const serviceCompleted = verifiedServiceHours >= SERVICE_HOURS_REQUIREMENT;
  const pendingHours = serviceHours?.filter(h => !h.verified).reduce((sum, h) => sum + Number(h.hours), 0) || 0;

  return (
    <Link to="/chapter">
      <Card className="border-border/60 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.98]">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Your Standing</span>
            </div>
            {profile?.status && (
              <StatusBadge status={profile.status} />
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Award className="h-3.5 w-3.5" />
                <span className="text-[10px] sm:text-xs">Points</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{totalPoints}</p>
            </div>
            
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[10px] sm:text-xs">Service Hours</span>
              </div>
              {serviceCompleted ? (
                <p className="text-sm sm:text-base font-semibold text-green-600">✓ Completed</p>
              ) : (
                <p className="text-xl sm:text-2xl font-bold text-foreground">
                  {verifiedServiceHours.toFixed(1)}
                  {pendingHours > 0 && (
                    <span className="text-xs sm:text-sm font-normal text-amber-600 ml-1">
                      +{pendingHours.toFixed(1)}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
