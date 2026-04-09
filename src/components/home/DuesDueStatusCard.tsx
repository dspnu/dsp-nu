import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CalendarClock, ChevronRight, DollarSign } from 'lucide-react';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { useDuesPersonalSchedule } from '@/features/dues/hooks/useDuesPersonalSchedule';
import { cn } from '@/lib/utils';

const DUES_HOME_WIDGET_KEY = 'dues_home_widget_visible';

/**
 * Home dashboard card: highlights overdue installments and upcoming dues deadlines.
 */
export function DuesDueStatusCard() {
  const { data: widgetVisible, isLoading: settingLoading } = useChapterSetting(DUES_HOME_WIDGET_KEY, {
    whenMissing: true,
  });
  const { balanceInfo, overdueInstallments, upcomingInstallments, hasOverdue } = useDuesPersonalSchedule();

  if (settingLoading || !widgetVisible) return null;

  if (!balanceInfo) return null;

  const next = upcomingInstallments[0];
  const showCard = hasOverdue || balanceInfo.balance > 0;

  if (!showCard) return null;

  return (
    <Link to="/chapter" className="block">
      <Card
        className={cn(
          'overflow-hidden border transition-all hover:shadow-md active:scale-[0.99]',
          hasOverdue
            ? 'border-destructive/40 bg-gradient-to-br from-destructive/[0.12] via-card to-card'
            : 'border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-card'
        )}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                hasOverdue ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-700 dark:text-amber-200'
              )}
            >
              {hasOverdue ? (
                <AlertTriangle className="h-5 w-5" />
              ) : (
                <CalendarClock className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {hasOverdue ? 'Overdue dues payment' : 'Dues balance'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasOverdue
                      ? 'One or more installments are past due.'
                      : 'You have an outstanding chapter balance.'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2.5 py-1 text-sm font-semibold tabular-nums">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  {balanceInfo.balance.toFixed(2)}
                  <span className="text-xs font-normal text-muted-foreground">due</span>
                </span>
                {next && !hasOverdue && (
                  <span className="text-xs text-muted-foreground">
                    Next: {format(new Date(next.due_date), 'MMM d')} · #
                    {next.installment_number}
                  </span>
                )}
              </div>

              {hasOverdue && overdueInstallments.length > 0 && (
                <ul className="space-y-1 rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2 text-xs">
                  {overdueInstallments.slice(0, 3).map((o) => (
                    <li key={o.id} className="flex justify-between gap-2 tabular-nums">
                      <span className="text-destructive font-medium">
                        Installment #{o.installmentNumber} overdue
                      </span>
                      <span>
                        {format(new Date(o.dueDate), 'MMM d')} · ${o.amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                  {overdueInstallments.length > 3 && (
                    <li className="text-muted-foreground">
                      +{overdueInstallments.length - 3} more
                    </li>
                  )}
                </ul>
              )}

              <p className="text-[11px] text-muted-foreground">
                Visit Chapter for contacts. The VP of Finance records payments and can answer questions about your balance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
