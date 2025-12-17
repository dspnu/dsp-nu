import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, Award, Briefcase, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mainNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Members', path: '/members' },
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Award, label: 'Points', path: '/points' },
];

const moreNavItems = [
  { label: 'Job Board', path: '/jobs' },
  { label: 'Alumni', path: '/alumni' },
  { label: 'Resources', path: '/resources' },
  { label: 'Coffee Chats', path: '/coffee-chats' },
  { label: 'EOP Voting', path: '/eop' },
  { label: 'Settings', path: '/settings' },
  { label: 'Help', path: '/help' },
];

export function MobileNav() {
  const location = useLocation();
  const isMoreActive = moreNavItems.some(item => location.pathname === item.path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe md:hidden">
      <div className="flex items-center justify-around h-16">
        {mainNavItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isMoreActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 mb-2">
            {moreNavItems.map(({ label, path }) => (
              <DropdownMenuItem key={path} asChild>
                <Link
                  to={path}
                  className={cn(
                    'w-full',
                    location.pathname === path && 'bg-accent'
                  )}
                >
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
