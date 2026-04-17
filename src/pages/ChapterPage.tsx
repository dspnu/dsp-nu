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
import { useChapterSetting } from '@/hooks/useChapterSettings';

interface TabDef {
  key: string;
  label: string;
  icon: typeof Award;
  component: React.ComponentType;
}

export default function ChapterPage() {
  const { profile, isAdminOrOfficer } = useAuth();
  const [activeTab, setActiveTab] = useState('standing');
  const { data: showAdminTabSetting } = useChapterSetting('chapter_admin_tab_visible', { whenMissing: true });

  const hasExecPosition = (profile?.positions?.length ?? 0) > 0;
  const showAdminTab = (hasExecPosition || isAdminOrOfficer) && showAdminTabSetting !== false;

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="max-w-3xl w-full overflow-x-auto pb-1 -mx-1 px-1">
          <TabsList className="inline-flex h-10 w-max min-w-full sm:min-w-0 flex-nowrap justify-start gap-0.5 rounded-md bg-muted/70 p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <TabsTrigger key={key} value={key} className="shrink-0 gap-1.5 px-3">
                <Icon className="h-4 w-4 opacity-80 hidden sm:block" />
                <span className="whitespace-nowrap">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map(({ key, component: Component }) => (
          <TabsContent key={key} value={key} className="space-y-6">
            <Component />
          </TabsContent>
        ))}
      </Tabs>
    </AppLayout>
  );
}
