import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { BrotherhoodTicketsManager } from '@/features/ticketing/components/BrotherhoodTicketsManager';

export default function TicketsPage() {
  return (
    <AppLayout>
      <PageHeader title="Brotherhood tickets" className="mb-4" />
      <BrotherhoodTicketsManager syncRouterSearchParams defaultTab="browse" />
    </AppLayout>
  );
}
