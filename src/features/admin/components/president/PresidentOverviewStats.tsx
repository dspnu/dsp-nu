import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Shield, TrendingUp, Users } from 'lucide-react';

export interface PresidentOverviewStatsProps {
  activeMemberCount: number;
  goodStandingCount: number;
  totalDuesCollected: number;
  duesPaymentCount: number;
}

export function PresidentOverviewStats({
  activeMemberCount,
  goodStandingCount,
  totalDuesCollected,
  duesPaymentCount,
}: PresidentOverviewStatsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{activeMemberCount}</p>
            <p className="text-xs text-muted-foreground">Active Members</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {goodStandingCount}/{activeMemberCount}
            </p>
            <p className="text-xs text-muted-foreground">Good Standing</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">${totalDuesCollected.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Dues Collected</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{duesPaymentCount}</p>
            <p className="text-xs text-muted-foreground">Dues Payments</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
