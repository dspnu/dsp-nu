import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export default function MembersPage() {
  return (
    <AppLayout>
      <PageHeader title="Members" description="Chapter roster and directory" />
      <EmptyState
        icon={Users}
        title="No members yet"
        description="Members will appear here once they sign up and join the chapter."
      />
    </AppLayout>
  );
}
