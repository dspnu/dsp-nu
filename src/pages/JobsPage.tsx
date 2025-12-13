import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Briefcase } from 'lucide-react';

export default function JobsPage() {
  return (
    <AppLayout>
      <PageHeader title="Job Board" description="Internships and job opportunities" />
      <EmptyState icon={Briefcase} title="No job postings" description="Job and internship opportunities will appear here." />
    </AppLayout>
  );
}
