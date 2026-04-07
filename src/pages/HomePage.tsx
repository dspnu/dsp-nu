import { AppLayout } from '@/components/layout/AppLayout';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { UpcomingEventCard } from '@/components/home/UpcomingEventCard';
import { StandingCard } from '@/components/home/StandingCard';
import { AlertsSection } from '@/components/home/AlertsSection';
import { QuickActions } from '@/components/home/QuickActions';
import { UpcomingTimeline } from '@/components/home/UpcomingTimeline';
import { PDPProgressCard } from '@/components/home/PDPProgressCard';
import { PaddleSubmissionCard } from '@/components/home/PaddleSubmissionCard';
import { ElectionVotingCards } from '@/components/elections/ElectionVotingCard';

export default function HomePage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Welcome */}
        <WelcomeHeader />

        {/* Alerts */}
        <AlertsSection />

        {/* PDP Progress for New Members */}
        <PDPProgressCard />

        {/* Paddle Submission */}
        <PaddleSubmissionCard />

        {/* Active Elections */}
        <ElectionVotingCards />

        {/* At-a-glance cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          <UpcomingEventCard />
          <StandingCard />
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Timeline */}
        <UpcomingTimeline />
      </div>
    </AppLayout>
  );
}
