import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Coffee } from 'lucide-react';

export default function CoffeeChatsPage() {
  return (
    <AppLayout>
      <PageHeader title="Coffee Chats" description="Track your sig meetings" />
      <EmptyState icon={Coffee} title="No coffee chats" description="Log your coffee chats with chapter members here." />
    </AppLayout>
  );
}
