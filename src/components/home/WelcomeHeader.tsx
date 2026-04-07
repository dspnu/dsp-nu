import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

export function WelcomeHeader() {
  const { profile } = useAuth();
  
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const semester = month >= 7 ? 'Fall' : 'Spring';

  const greeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
          {greeting()}, {profile?.first_name || 'Brother'}
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          {semester} {year} • Nu Chapter
        </p>
      </div>
      {profile?.status && (
        <Badge variant="outline" className="capitalize text-xs hidden sm:inline-flex">
          {profile.status.replace('_', ' ')}
        </Badge>
      )}
    </div>
  );
}
