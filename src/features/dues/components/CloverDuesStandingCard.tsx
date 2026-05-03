import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/core/auth/AuthContext';
import { useDuesPersonalSchedule } from '@/features/dues/hooks/useDuesPersonalSchedule';
import {
  isCloverCheckoutUiEnabled,
  useCreateCloverCheckout,
} from '@/features/payments/hooks/useCloverCheckout';
import { CreditCard, ExternalLink } from 'lucide-react';

/**
 * Standing tab: pay remaining chapter balance via Clover Hosted Checkout (when enabled).
 */
export function CloverDuesStandingCard() {
  const { user } = useAuth();
  const { balanceInfo, semester } = useDuesPersonalSchedule();
  const createClover = useCreateCloverCheckout();

  if (!isCloverCheckoutUiEnabled() || !user || !balanceInfo || balanceInfo.balance <= 0) {
    return null;
  }

  const amountCents = Math.max(1, Math.round(balanceInfo.balance * 100));

  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.06] to-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Chapter dues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Outstanding balance{' '}
          <span className="font-semibold tabular-nums text-foreground">${balanceInfo.balance.toFixed(2)}</span>
          <span className="text-muted-foreground"> · {semester}</span>
        </p>
        <Button
          type="button"
          className="gap-2"
          disabled={createClover.isPending}
          onClick={() =>
            createClover.mutate(
              { purpose: 'dues', amountCents, semester },
              {
                onSuccess: (res) => {
                  window.open(res.url, '_blank', 'noopener,noreferrer');
                },
              }
            )
          }
        >
          {createClover.isPending ? 'Creating checkout…' : 'Pay with Clover'}
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
        <p className="text-[11px] text-muted-foreground">
          You will complete payment on Clover's secure page. Your balance updates automatically after the payment is
          approved.
        </p>
      </CardContent>
    </Card>
  );
}
