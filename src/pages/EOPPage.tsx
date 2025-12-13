import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Vote } from 'lucide-react';

export default function EOPPage() {
  return (
    <AppLayout>
      <PageHeader title="EOP Voting" description="Election of Pledges" />
      <EmptyState icon={Vote} title="No active voting" description="EOP voting sessions will appear here when opened by officers." />
    </AppLayout>
  );
}
