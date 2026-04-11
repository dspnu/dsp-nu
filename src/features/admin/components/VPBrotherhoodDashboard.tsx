import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BrotherhoodTicketsManager } from '@/features/ticketing/components/BrotherhoodTicketsManager';
import { org } from '@/config/org';
import { ExternalLink, Ticket } from 'lucide-react';

export function VPBrotherhoodDashboard() {
  if (!org.features.ticketing) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            VP of Brotherhood
          </h3>
          <p className="text-sm text-muted-foreground">
            Create ticketed events, assign tickets, update payment status, and check in attendees.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
          <Link to="/tickets">
            Open full tickets page
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <BrotherhoodTicketsManager syncRouterSearchParams={false} defaultTab="admin" />
    </div>
  );
}
