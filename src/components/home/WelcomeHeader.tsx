import { useAuth } from '@/contexts/AuthContext';

export function WelcomeHeader() {
  const { profile } = useAuth();
  
  // Get current semester (Spring/Fall based on month)
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const semester = month >= 7 ? 'Fall' : 'Spring';

  return (
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
        Welcome back, {profile?.first_name || 'Brother'}
      </h1>
      <p className="text-muted-foreground text-sm">
        {semester} {year} • Nu Chapter
      </p>
    </div>
  );
}
