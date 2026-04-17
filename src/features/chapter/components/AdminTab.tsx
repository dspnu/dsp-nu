import { type ComponentType } from 'react';
import { useAuth } from '@/core/auth/AuthContext';
import { useIsVPChapterOps } from '@/features/eop/hooks/useEOPRealtime';
import { VPChapterOpsDashboard } from '@/features/admin/components/VPChapterOpsDashboard';
import { VPCommunityServiceDashboard } from '@/features/admin/components/VPCommunityServiceDashboard';
import { VPProfessionalActivitiesDashboard } from '@/features/admin/components/VPProfessionalActivitiesDashboard';
import { VPScholarshipDashboard } from '@/features/admin/components/VPScholarshipDashboard';
import { PresidentDashboard } from '@/features/admin/components/PresidentDashboard';
import { VPFinanceDashboard } from '@/features/admin/components/VPFinanceDashboard';
import { ChancellorDashboard } from '@/features/admin/components/ChancellorDashboard';
import { VPBrotherhoodDashboard } from '@/features/admin/components/VPBrotherhoodDashboard';
import { ChapterAnnouncementCard } from '@/features/chapter/components/ChapterAnnouncementCard';
import { hasPosition as checkPosition, org } from '@/config/org';
import { useChapterSetting } from '@/hooks/useChapterSettings';

interface AdminDashboardEntry {
  positions: string[];
  component: ComponentType;
  useHook?: boolean;
  featureFlag?: keyof typeof import('@/config/org').org.features;
}

const adminDashboards: AdminDashboardEntry[] = [
  { positions: ['VP of Chapter Operations'], component: VPChapterOpsDashboard, useHook: true, featureFlag: 'eop' },
  { positions: ['VP of Community Service'], component: VPCommunityServiceDashboard, featureFlag: 'serviceHours' },
  { positions: ['VP of Professional Activities'], component: VPProfessionalActivitiesDashboard },
  { positions: ['VP of Scholarship & Awards'], component: VPScholarshipDashboard },
  { positions: ['President'], component: PresidentDashboard },
  { positions: ['VP Finance', 'VP of Finance'], component: VPFinanceDashboard, featureFlag: 'dues' },
  { positions: ['Chancellor'], component: ChancellorDashboard, featureFlag: 'eop' },
  { positions: ['VP of Brotherhood'], component: VPBrotherhoodDashboard, featureFlag: 'ticketing' },
];

export function AdminTab() {
  const { profile } = useAuth();
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
    ? adminVisibilitySetting as Record<string, boolean>
    : {};

  return (
    <div className="space-y-8">
      {adminDashboards.map(({ positions, component: Dashboard, useHook, featureFlag }, idx) => {
        if (featureFlag && !org.features[featureFlag]) return null;
        const dashboardKey = (
          positions.includes('VP of Chapter Operations') ? 'chapterOps'
            : positions.includes('VP of Community Service') ? 'communityService'
              : positions.includes('VP of Professional Activities') ? 'professionalActivities'
                : positions.includes('VP of Scholarship & Awards') ? 'scholarship'
                  : positions.includes('VP Finance') || positions.includes('VP of Finance') ? 'finance'
                    : positions.includes('Chancellor') ? 'chancellor'
                      : positions.includes('VP of Brotherhood') ? 'brotherhood'
                        : null
        );
        if (dashboardKey && visibility[dashboardKey] === false) return null;
        const hasPos = useHook
          ? isVPChapterOps
          : checkPosition(profile, ...positions);

        if (!hasPos) return null;
        return <Dashboard key={idx} />;
      })}
      {visibility.announcements !== false && <ChapterAnnouncementCard />}
    </div>
  );
}
