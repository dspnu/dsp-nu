import { Vote, GraduationCap } from 'lucide-react';
import { registerFeature } from './featureRegistry';
import { org } from './org';

import EOPPage from '@/features/eop/pages/EOPPage';
import PDPPage from '@/features/pdp/pages/PDPPage';
import CoffeeChatDirectoryPage from '@/features/pdp/pages/CoffeeChatDirectoryPage';
import { PDPProgressCard } from '@/features/pdp/components/PDPProgressCard';
import { PaddleSubmissionCard } from '@/features/paddle-submissions/components/PaddleSubmissionCard';
import { ElectionVotingCards } from '@/features/elections/components/ElectionVotingCard';
import { DuesDueStatusCard } from '@/components/home/DuesDueStatusCard';
import TicketsPage from '@/features/ticketing/pages/TicketsPage';
import { TicketsHomeCard } from '@/features/ticketing/components/TicketsHomeCard';

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
