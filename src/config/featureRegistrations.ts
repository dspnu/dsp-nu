import { lazy } from 'react';
import { Vote, GraduationCap, Briefcase } from 'lucide-react';
import { registerFeature } from './featureRegistry';
import { org } from './org';

import { PDPProgressCard } from '@/features/pdp/components/PDPProgressCard';
import { PaddleSubmissionCard } from '@/features/paddle-submissions/components/PaddleSubmissionCard';
import { ElectionVotingCards } from '@/features/elections/components/ElectionVotingCard';
import { DuesDueStatusCard } from '@/components/home/DuesDueStatusCard';
import { TicketsHomeCard } from '@/features/ticketing/components/TicketsHomeCard';

const CareerHubPage = lazy(() => import('@/features/career/pages/CareerHubPage'));
const TicketsPage = lazy(() => import('@/features/ticketing/pages/TicketsPage'));
const EOPPage = lazy(() => import('@/features/eop/pages/EOPPage'));
const PDPPage = lazy(() => import('@/features/pdp/pages/PDPPage'));
const CoffeeChatDirectoryPage = lazy(() => import('@/features/pdp/pages/CoffeeChatDirectoryPage'));

registerFeature({
  key: 'careerHub',
  paths: ['src/features/career', 'supabase/functions/career-ai'],
  route: { path: '/career', component: CareerHubPage },
  navItem: { icon: Briefcase, label: 'Career', path: '/career', position: 50 },
});

registerFeature({
  key: 'ticketing',
  paths: ['src/features/ticketing'],
  dependsOn: ['dues'],
  route: { path: '/tickets', component: TicketsPage },
  dashboardCard: TicketsHomeCard,
});

registerFeature({
  key: 'eop',
  paths: ['src/features/eop'],
  route: { path: '/eop', component: EOPPage },
  navItem: { icon: Vote, label: 'EOP', path: '/eop', position: 60 },
});

registerFeature({
  key: 'pdp',
  paths: ['src/features/pdp'],
  dependsOn: ['coffeeChats'],
  route: { path: '/pdp', component: PDPPage },
  additionalRoutes: [
    { path: '/pdp/directory', component: CoffeeChatDirectoryPage },
  ],
  navItem: { icon: GraduationCap, label: 'PDP', path: '/pdp', position: 40 },
  dashboardCard: PDPProgressCard,
  visibilityCheck: (profile) => {
    const isNewMember = profile?.status === 'new_member';
    const isVP = org.pdpOfficerTitles.some((t: string) => profile?.positions?.includes(t));
    return isNewMember || isVP;
  },
});

registerFeature({
  key: 'elections',
  paths: ['src/features/elections'],
  dashboardCard: ElectionVotingCards,
});

registerFeature({
  key: 'paddleSubmissions',
  paths: ['src/features/paddle-submissions'],
  dashboardCard: PaddleSubmissionCard,
});

registerFeature({
  key: 'coffeeChats',
  paths: ['src/features/coffee-chats'],
});

registerFeature({
  key: 'familyGames',
  paths: ['src/features/family-games'],
});

registerFeature({
  key: 'dues',
  paths: ['src/features/dues', 'src/features/payments', 'src/components/home/DuesDueStatusCard.tsx'],
  dashboardCard: DuesDueStatusCard,
});

registerFeature({
  key: 'serviceHours',
  paths: ['src/features/service-hours'],
});

registerFeature({
  key: 'jobBoard',
  paths: ['src/features/jobs'],
});

registerFeature({
  key: 'alumni',
  paths: ['src/features/alumni'],
});
