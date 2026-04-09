import { useState, useMemo } from 'react';
import { AppLayout } from '@/core/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Briefcase, Coffee, FolderOpen, Shield } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthContext';
import { org } from '@/config/org';
import { StandingTab } from '@/features/chapter/components/StandingTab';
import { JobsTab } from '@/features/chapter/components/JobsTab';
import { CoffeeChatsTab } from '@/features/chapter/components/CoffeeChatsTab';
import { ResourcesTab } from '@/features/chapter/components/ResourcesTab';
import { AdminTab } from '@/features/chapter/components/AdminTab';
import { ChapterAnnouncementCard } from '@/features/chapter/components/ChapterAnnouncementCard';

interface TabDef {
  key: string;
  label: string;
  icon: typeof Award;
  component: React.ComponentType;
}

export default function ChapterPage() {
  const { profile, isAdminOrOfficer } = useAuth();
  const [activeTab, setActiveTab] = useState('standing');

  const hasExecPosition = (profile?.positions?.length ?? 0) > 0;
  const showAdminTab = hasExecPosition || isAdminOrOfficer;

  const tabs = useMemo(() => {
    const t: TabDef[] = [
      { key: 'standing', label: 'Standing', icon: Award, component: StandingTab },
    ];

    if (org.features.jobBoard) {
      t.push({ key: 'jobs', label: 'Jobs', icon: Briefcase, component: JobsTab });
    }
    if (org.features.coffeeChats) {
      t.push({ key: 'coffee-chats', label: 'Coffee Chats', icon: Coffee, component: CoffeeChatsTab });
    }

    t.push({ key: 'resources', label: 'Resources', icon: FolderOpen, component: ResourcesTab });

    if (showAdminTab) {
      t.push({ key: 'admin', label: 'Admin', icon: Shield, component: AdminTab });
    }

    return t;
  }, [showAdminTab]);

  return (
    <AppLayout>
      <PageHeader
        title="Chapter"
        description="Your one-stop hub for chapter life"
      />

      <ChapterAnnouncementCard />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full max-w-2xl grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="gap-2">
              <Icon className="h-4 w-4 hidden sm:block" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(({ key, component: Component }) => (
          <TabsContent key={key} value={key} className="space-y-6">
            <Component />
          </TabsContent>
        ))}
      </Tabs>
    </AppLayout>
  );
}
