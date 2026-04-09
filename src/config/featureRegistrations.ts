import { Vote, GraduationCap, Coffee, Briefcase } from 'lucide-react';
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
  route: { path: '/tickets', component: TicketsPage },
  dashboardCard: TicketsHomeCard,
});

registerFeature({
  key: 'eop',
  route: { path: '/eop', component: EOPPage },
  navItem: { icon: Vote, label: 'EOP', path: '/eop', position: 60 },
});

registerFeature({
  key: 'pdp',
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
  dashboardCard: ElectionVotingCards,
});

registerFeature({
  key: 'paddleSubmissions',
  dashboardCard: PaddleSubmissionCard,
});

registerFeature({
  key: 'coffeeChats',
});

registerFeature({
  key: 'familyGames',
});

registerFeature({
  key: 'dues',
  dashboardCard: DuesDueStatusCard,
});

registerFeature({
  key: 'serviceHours',
});

registerFeature({
  key: 'jobBoard',
});

registerFeature({
  key: 'alumni',
});
