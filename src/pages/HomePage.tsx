import { AppLayout } from '@/components/layout/AppLayout';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { UpcomingEventCard } from '@/components/home/UpcomingEventCard';
import { StandingCard } from '@/components/home/StandingCard';
import { AlertsSection } from '@/components/home/AlertsSection';
import { QuickActions } from '@/components/home/QuickActions';
import { UpcomingTimeline } from '@/components/home/UpcomingTimeline';
import { PDPProgressCard } from '@/components/home/PDPProgressCard';
import { PaddleSubmissionCard } from '@/components/home/PaddleSubmissionCard';

export default function HomePage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5 sm:space-y-6">
        {/* Welcome Section */}
        <WelcomeHeader />

        {/* Alerts / Notifications */}
        <AlertsSection />

        {/* PDP Progress for New Members */}
        <PDPProgressCard />

        {/* Paddle Submission (toggled by admin) */}
        <PaddleSubmissionCard />

        {/* Primary Cards */}
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <UpcomingEventCard />
          <StandingCard />
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Upcoming Timeline */}
        <UpcomingTimeline />
      </div>
    </AppLayout>
  );
}
