import { lazy, Suspense, useMemo, useCallback, useEffect, type ComponentType, type LazyExoticComponent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PresidentDashboard } from '@/features/admin/components/PresidentDashboard';
import { ChapterAnnouncementCard } from '@/features/chapter/components/ChapterAnnouncementCard';
import { useIsVPChapterOps } from '@/features/eop/hooks/useEOPRealtime';
import { org } from '@/config/org';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { LayoutDashboard, Briefcase } from 'lucide-react';

const LazyVPChapterOpsDashboard = lazy(() =>
  import('@/features/admin/components/VPChapterOpsDashboard').then((m) => ({ default: m.VPChapterOpsDashboard })),
);
const LazyVPCommunityServiceDashboard = lazy(() =>
  import('@/features/admin/components/VPCommunityServiceDashboard').then((m) => ({
    default: m.VPCommunityServiceDashboard,
  })),
);
const LazyVPProfessionalActivitiesDashboard = lazy(() =>
  import('@/features/admin/components/VPProfessionalActivitiesDashboard').then((m) => ({
    default: m.VPProfessionalActivitiesDashboard,
  })),
);
const LazyVPScholarshipDashboard = lazy(() =>
  import('@/features/admin/components/VPScholarshipDashboard').then((m) => ({ default: m.VPScholarshipDashboard })),
);
const LazyVPFinanceDashboard = lazy(() =>
  import('@/features/admin/components/VPFinanceDashboard').then((m) => ({ default: m.VPFinanceDashboard })),
);
const LazyChancellorDashboard = lazy(() =>
  import('@/features/admin/components/ChancellorDashboard').then((m) => ({ default: m.ChancellorDashboard })),
);
const LazyVPBrotherhoodDashboard = lazy(() =>
  import('@/features/admin/components/VPBrotherhoodDashboard').then((m) => ({ default: m.VPBrotherhoodDashboard })),
);

const PRESIDENT_ADMIN_QUERY_KEY = 'presidentAdmin';

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
  LazyDashboard: LazyExoticComponent<ComponentType>;
  featureFlag?: keyof typeof org.features;
  useChapterOpsHook?: boolean;
}

const OVERSIGHT_TABS: OversightTab[] = [
  {
    id: 'chapter-ops',
    label: 'Chapter operations',
    visibilityKey: 'chapterOps',
    LazyDashboard: LazyVPChapterOpsDashboard,
    featureFlag: 'eop',
    useChapterOpsHook: true,
  },
  {
    id: 'community-service',
    label: 'Community service',
    visibilityKey: 'communityService',
    LazyDashboard: LazyVPCommunityServiceDashboard,
    featureFlag: 'serviceHours',
  },
  {
    id: 'professional',
    label: 'Professional activities',
    visibilityKey: 'professionalActivities',
    LazyDashboard: LazyVPProfessionalActivitiesDashboard,
  },
  {
    id: 'scholarship',
    label: 'Scholarship',
    visibilityKey: 'scholarship',
    LazyDashboard: LazyVPScholarshipDashboard,
  },
  {
    id: 'finance',
    label: 'Finance',
    visibilityKey: 'finance',
    LazyDashboard: LazyVPFinanceDashboard,
    featureFlag: 'dues',
  },
  {
    id: 'chancellor',
    label: 'Chancellor',
    visibilityKey: 'chancellor',
    LazyDashboard: LazyChancellorDashboard,
    featureFlag: 'eop',
  },
  {
    id: 'brotherhood',
    label: 'Brotherhood',
    visibilityKey: 'brotherhood',
    LazyDashboard: LazyVPBrotherhoodDashboard,
    featureFlag: 'ticketing',
  },
];

function DashboardFallback() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
      Loading dashboard…
    </div>
  );
}

export function PresidentAdminShell() {
  const { isVPChapterOps } = useIsVPChapterOps();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const visibility = useMemo(() => {
    return adminVisibilitySetting && typeof adminVisibilitySetting === 'object' && !Array.isArray(adminVisibilitySetting)
      ? (adminVisibilitySetting as Record<string, boolean>)
      : {};
  }, [adminVisibilitySetting]);

  const visibleOversight = useMemo(() => {
    return OVERSIGHT_TABS.filter((tab) => {
      if (tab.featureFlag && !org.features[tab.featureFlag]) return false;
      if (visibility[tab.visibilityKey] === false) return false;
      if (tab.useChapterOpsHook && !isVPChapterOps) return false;
      return true;
    });
  }, [visibility, isVPChapterOps]);

  const visibleIds = useMemo(() => new Set(visibleOversight.map((t) => t.id)), [visibleOversight]);

  const paramRaw = searchParams.get(PRESIDENT_ADMIN_QUERY_KEY);
  const param = paramRaw === '' || paramRaw === null ? 'overview' : paramRaw;

  const resolvedExecId = useMemo(() => {
    if (visibleOversight.length === 0) return '';
    if (param !== 'overview' && visibleIds.has(param)) return param;
    return visibleOversight[0].id;
  }, [param, visibleIds, visibleOversight]);

  const primaryTab = param !== 'overview' && visibleIds.has(param) ? 'executive' : 'overview';

  useEffect(() => {
    if (visibleOversight.length === 0) return;
    if (param !== 'overview' && !visibleIds.has(param)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(PRESIDENT_ADMIN_QUERY_KEY, 'overview');
          return next;
        },
        { replace: true },
      );
    }
  }, [param, visibleIds, visibleOversight.length, setSearchParams]);

  const setPresidentAdminParam = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(PRESIDENT_ADMIN_QUERY_KEY, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const onPrimaryChange = (value: string) => {
    if (value === 'overview') {
      setPresidentAdminParam('overview');
      return;
    }
    const id = resolvedExecId || visibleOversight[0]?.id;
    if (id) setPresidentAdminParam(id);
  };

  const onExecSelect = (id: string) => {
    setPresidentAdminParam(id);
  };

  const selectedTab = visibleOversight.find((t) => t.id === resolvedExecId);
  const LazySelected = selectedTab?.LazyDashboard;

  const showExecutiveTab = visibleOversight.length > 0;

  return (
    <div className="space-y-6">
      <Tabs value={primaryTab} onValueChange={onPrimaryChange} className="space-y-6">
        <div className="max-w-full overflow-x-auto pb-1 -mx-1 px-1">
          <TabsList className="inline-flex h-auto min-h-10 w-max flex-wrap justify-start gap-1 rounded-md bg-muted/70 p-1">
            <TabsTrigger value="overview" className="gap-1.5 shrink-0">
              <LayoutDashboard className="h-4 w-4 opacity-80" />
              Overview
            </TabsTrigger>
            {showExecutiveTab && (
              <TabsTrigger value="executive" className="gap-1.5 shrink-0">
                <Briefcase className="h-4 w-4 opacity-80" />
                Executive dashboards
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <PresidentDashboard />
        </TabsContent>

        {showExecutiveTab && (
          <TabsContent value="executive" className="mt-0 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Choose an area to view that executive&apos;s tools.</p>
              <Select value={resolvedExecId} onValueChange={onExecSelect}>
                <SelectTrigger className="w-full sm:w-[min(100%,280px)]">
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent>
                  {visibleOversight.map((tab) => (
                    <SelectItem key={tab.id} value={tab.id}>
                      {tab.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {LazySelected && (
              <Suspense fallback={<DashboardFallback />}>
                <LazySelected />
              </Suspense>
            )}
          </TabsContent>
        )}
      </Tabs>

      {visibility.announcements !== false && <ChapterAnnouncementCard />}
    </div>
  );
}
