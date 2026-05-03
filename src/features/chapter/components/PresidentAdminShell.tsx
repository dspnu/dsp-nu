import { useMemo, useState, type ComponentType } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PresidentDashboard } from '@/features/admin/components/PresidentDashboard';
import { VPChapterOpsDashboard } from '@/features/admin/components/VPChapterOpsDashboard';
import { VPCommunityServiceDashboard } from '@/features/admin/components/VPCommunityServiceDashboard';
import { VPProfessionalActivitiesDashboard } from '@/features/admin/components/VPProfessionalActivitiesDashboard';
import { VPScholarshipDashboard } from '@/features/admin/components/VPScholarshipDashboard';
import { VPFinanceDashboard } from '@/features/admin/components/VPFinanceDashboard';
import { ChancellorDashboard } from '@/features/admin/components/ChancellorDashboard';
import { VPBrotherhoodDashboard } from '@/features/admin/components/VPBrotherhoodDashboard';
import { ChapterAnnouncementCard } from '@/features/chapter/components/ChapterAnnouncementCard';
import { useIsVPChapterOps } from '@/features/eop/hooks/useEOPRealtime';
import { org } from '@/config/org';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { LayoutDashboard, Briefcase } from 'lucide-react';

type AdminVisibilityKey =
  | 'chapterOps'
  | 'communityService'
  | 'professionalActivities'
  | 'scholarship'
  | 'finance'
  | 'chancellor'
  | 'brotherhood';

interface OversightTab {
  id: string;
  label: string;
  visibilityKey: AdminVisibilityKey;
  component: ComponentType;
  featureFlag?: keyof typeof org.features;
  useChapterOpsHook?: boolean;
}

const OVERSIGHT_TABS: OversightTab[] = [
  {
    id: 'chapter-ops',
    label: 'Chapter operations',
    visibilityKey: 'chapterOps',
    component: VPChapterOpsDashboard,
    featureFlag: 'eop',
    useChapterOpsHook: true,
  },
  {
    id: 'community-service',
    label: 'Community service',
    visibilityKey: 'communityService',
    component: VPCommunityServiceDashboard,
    featureFlag: 'serviceHours',
  },
  {
    id: 'professional',
    label: 'Professional activities',
    visibilityKey: 'professionalActivities',
    component: VPProfessionalActivitiesDashboard,
  },
  {
    id: 'scholarship',
    label: 'Scholarship',
    visibilityKey: 'scholarship',
    component: VPScholarshipDashboard,
  },
  {
    id: 'finance',
    label: 'Finance',
    visibilityKey: 'finance',
    component: VPFinanceDashboard,
    featureFlag: 'dues',
  },
  {
    id: 'chancellor',
    label: 'Chancellor',
    visibilityKey: 'chancellor',
    component: ChancellorDashboard,
    featureFlag: 'eop',
  },
  {
    id: 'brotherhood',
    label: 'Brotherhood',
    visibilityKey: 'brotherhood',
    component: VPBrotherhoodDashboard,
    featureFlag: 'ticketing',
  },
];

export function PresidentAdminShell() {
  const { isVPChapterOps } = useIsVPChapterOps();
  const { data: adminVisibilitySetting } = useChapterSetting('admin_tab_visibility', {
    whenMissing: {
      chapterOps: true,
      communityService: true,
      professionalActivities: true,
      scholarship: true,
      finance: true,
      chancellor: true,
      brotherhood: true,
      announcements: true,
    },
  });
  const visibility = (adminVisibilitySetting && typeof adminVisibilitySetting === 'object' && !Array.isArray(adminVisibilitySetting))
    ? (adminVisibilitySetting as Record<string, boolean>)
    : {};

  const visibleOversight = useMemo(() => {
    return OVERSIGHT_TABS.filter((tab) => {
      if (tab.featureFlag && !org.features[tab.featureFlag]) return false;
      if (visibility[tab.visibilityKey] === false) return false;
      if (tab.useChapterOpsHook && !isVPChapterOps) return false;
      return true;
    });
  }, [visibility, isVPChapterOps]);

  const [active, setActive] = useState('overview');

  return (
    <div className="space-y-6">
      <Tabs value={active} onValueChange={setActive} className="space-y-6">
        <div className="max-w-full overflow-x-auto pb-1 -mx-1 px-1">
          <TabsList className="inline-flex h-auto min-h-10 w-max flex-wrap justify-start gap-1 rounded-md bg-muted/70 p-1">
            <TabsTrigger value="overview" className="gap-1.5 shrink-0">
              <LayoutDashboard className="h-4 w-4 opacity-80" />
              Overview
            </TabsTrigger>
            {visibleOversight.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 shrink-0">
                <Briefcase className="h-4 w-4 opacity-80 hidden sm:inline" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <PresidentDashboard />
        </TabsContent>

        {visibleOversight.map((tab) => {
          const Dashboard = tab.component;
          return (
            <TabsContent key={tab.id} value={tab.id} className="mt-0 space-y-6">
              <Dashboard />
            </TabsContent>
          );
        })}
      </Tabs>

      {visibility.announcements !== false && <ChapterAnnouncementCard />}
    </div>
  );
}
