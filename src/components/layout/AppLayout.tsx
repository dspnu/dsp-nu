import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MobileNav } from './MobileNav';
import { DesktopSidebar } from './DesktopSidebar';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground font-display font-bold text-xl">ΔΣΠ</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="container py-4 md:py-8 max-w-7xl">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
