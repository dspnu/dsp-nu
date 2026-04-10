import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthContext';
import { MobileNav } from './MobileNav';
import { DesktopSidebar } from './DesktopSidebar';
import { Loader2 } from 'lucide-react';
import { org } from '@/config/org';
import { AppCopyrightFooter } from '@/components/layout/AppCopyrightFooter';
import { EventReminderSync } from '@/features/notifications/components/EventReminderSync';
import { TicketPaymentReminderSync } from '@/features/notifications/components/TicketPaymentReminderSync';
import { DuesReminderSync } from '@/features/dues/components/DuesReminderSync';
import { AddToHomeScreenProvider } from '@/components/pwa/AddToHomeScreenPrompt';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground font-display font-bold text-xl">{org.greekLetters}</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to onboarding if profile is incomplete
  if (profile && !profile.major && !profile.graduation_year) {
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
