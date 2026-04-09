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
import { ChapterAnnouncementCard } from '@/features/chapter/components/ChapterAnnouncementCard';
import { hasPosition as checkPosition } from '@/config/org';

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
];

export function AdminTab() {
  const { profile } = useAuth();
  const { isVPChapterOps } = useIsVPChapterOps();

  return (
    <div className="space-y-8">
      {adminDashboards.map(({ positions, component: Dashboard, useHook }, idx) => {
        const hasPos = useHook
          ? isVPChapterOps
          : checkPosition(profile, ...positions);

        if (!hasPos) return null;
        return <Dashboard key={idx} />;
      })}
      <ChapterAnnouncementCard />
    </div>
  );
}
