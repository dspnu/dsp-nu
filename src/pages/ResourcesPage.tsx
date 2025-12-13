import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { FolderOpen } from 'lucide-react';

export default function ResourcesPage() {
  return (
    <AppLayout>
      <PageHeader title="Resources" description="Chapter documents and files" />
      <EmptyState icon={FolderOpen} title="No resources" description="Chapter resources and documents will appear here." />
    </AppLayout>
  );
}
