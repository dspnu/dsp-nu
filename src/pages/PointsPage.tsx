import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Award } from 'lucide-react';

export default function PointsPage() {
  return (
    <AppLayout>
      <PageHeader title="Points" description="Your chapter points breakdown" />
      <EmptyState icon={Award} title="No points yet" description="Earn points by attending events and participating in chapter activities." />
    </AppLayout>
  );
}
