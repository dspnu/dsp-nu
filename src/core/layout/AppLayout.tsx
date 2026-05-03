import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { profileNeedsOnboarding } from '@/core/auth/profileNeedsOnboarding';
import { MobileNav } from './MobileNav';
import { DesktopSidebar } from './DesktopSidebar';
import { Loader2 } from 'lucide-react';
import { org } from '@/config/org';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';
import { EventReminderSync } from '@/features/notifications/components/EventReminderSync';
import { TicketPaymentReminderSync } from '@/features/notifications/components/TicketPaymentReminderSync';
import { DuesReminderSync } from '@/features/dues/components/DuesReminderSync';
import { AddToHomeScreenProvider } from '@/components/pwa/AddToHomeScreenPrompt';
import { AppLogo } from '@/components/branding/AppLogo';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <AppLogo className="h-12 w-12 animate-pulse rounded-xl" alt={`${org.shortName} logo`} />
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profileNeedsOnboarding(profile)) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AddToHomeScreenProvider>
      <div className="min-h-screen bg-background">
        <EventReminderSync />
        {org.features.ticketing && <TicketPaymentReminderSync />}
        <DuesReminderSync />
        <DesktopSidebar />
        <main className="md:ml-64 pb-28 md:pb-0">
          <div className="px-4 sm:px-6 lg:px-8 py-5 md:py-8 max-w-7xl mx-auto">
            {children}
            <AppCopyrightFooter className="mt-10 pt-6 border-t border-border/50" />
          </div>
        </main>
        <MobileNav />
      </div>
    </AddToHomeScreenProvider>
  );
}
