import { AppLayout } from '@/components/layout/AppLayout';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { UpcomingEventCard } from '@/components/home/UpcomingEventCard';
import { StandingCard } from '@/components/home/StandingCard';
import { AlertsSection } from '@/components/home/AlertsSection';
import { QuickActions } from '@/components/home/QuickActions';
import { UpcomingTimeline } from '@/components/home/UpcomingTimeline';

export default function HomePage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Welcome Section */}
        <WelcomeHeader />

        {/* Alerts / Notifications */}
        <AlertsSection />

        {/* Primary Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
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
