import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardCheck } from 'lucide-react';

export default function AttendancePage() {
  return (
    <AppLayout>
      <PageHeader title="Attendance" description="Track your event attendance" />
      <EmptyState icon={ClipboardCheck} title="No attendance records" description="Your attendance will be tracked here." />
    </AppLayout>
  );
}
