import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Calendar } from 'lucide-react';

export default function EventsPage() {
  return (
    <AppLayout>
      <PageHeader title="Events" description="Chapter events and calendar" />
      <EmptyState
        icon={Calendar}
        title="No upcoming events"
        description="Events will appear here when officers create them."
      />
    </AppLayout>
  );
}
