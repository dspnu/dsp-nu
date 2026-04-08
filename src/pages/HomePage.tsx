import { AppLayout } from '@/core/layout/AppLayout';
import { WelcomeHeader } from '@/components/home/WelcomeHeader';
import { UpcomingEventCard } from '@/components/home/UpcomingEventCard';
import { StandingCard } from '@/components/home/StandingCard';
import { AlertsSection } from '@/components/home/AlertsSection';
import { QuickActions } from '@/components/home/QuickActions';
import { UpcomingTimeline } from '@/components/home/UpcomingTimeline';
import { getEnabledDashboardCards } from '@/config/featureRegistry';

const dashboardCards = getEnabledDashboardCards();

export default function HomePage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <WelcomeHeader />

        <AlertsSection />

        {dashboardCards.map(({ key, component: Card }) => (
          <Card key={key} />
        ))}

        <div className="grid gap-3 sm:grid-cols-2">
          <UpcomingEventCard />
          <StandingCard />
        </div>

        <QuickActions />

        <UpcomingTimeline />
      </div>
    </AppLayout>
  );
}
