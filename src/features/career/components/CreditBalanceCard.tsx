import { Sparkles, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCareerCredits } from '../hooks/useCareerCredits';
import { formatDistanceToNowStrict } from 'date-fns';

export function CreditBalanceCard() {
  const { data, isLoading } = useCareerCredits();

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  const total = data?.total ?? 0;
  const reset = data?.nextReset;

  return (
    <Card className="p-4 sm:p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            AI Credits
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">{total}</span>
            <span className="text-sm text-muted-foreground">
              available {data?.bonusRemaining ? `(includes ${data.bonusRemaining} bonus)` : ''}
            </span>
          </div>
        </div>
        {reset && (
          <div className="text-right shrink-0">
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> Resets
            </div>
            <div className="text-sm font-medium text-foreground">
              {formatDistanceToNowStrict(reset, { addSuffix: true })}
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        You get 1 AI credit per week. Spend it on any tool — resume review, LinkedIn, outreach, and more.
      </p>
    </Card>
  );
}
