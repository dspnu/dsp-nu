import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { GraduationCap } from 'lucide-react';

export default function AlumniPage() {
  return (
    <AppLayout>
      <PageHeader title="Alumni" description="Connect with chapter alumni" />
      <EmptyState icon={GraduationCap} title="No alumni yet" description="Alumni network will appear here." />
    </AppLayout>
  );
}
