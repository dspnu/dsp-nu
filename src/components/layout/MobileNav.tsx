import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, Building, Vote, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function MobileNav() {
  const location = useLocation();
  const { profile } = useAuth();

  const isNewMember = profile?.status === 'new_member';
  const isVP = profile?.positions?.includes('VP of New Member Development') ||
    profile?.positions?.includes('VP of Pledge Education') ||
    profile?.positions?.includes('VP of New Member Education');
  const showPDP = isNewMember || isVP;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Calendar, label: 'Events', path: '/events' },
    ...(showPDP ? [{ icon: GraduationCap, label: 'PDP', path: '/pdp' }] : []),
    { icon: Building, label: 'Chapter', path: '/chapter' },
    { icon: Vote, label: 'EOP', path: '/eop' },
    ...(!showPDP ? [{ icon: Users, label: 'People', path: '/people' }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 pb-safe md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || 
            (path !== '/' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all active:scale-95',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
