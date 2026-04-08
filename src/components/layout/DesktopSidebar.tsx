import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  Building,
  Vote,
  GraduationCap,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useChapterSetting } from '@/hooks/useChapterSettings';
import { org } from '@/config/org';

export function DesktopSidebar() {
  const location = useLocation();
  const { profile } = useAuth();
  const { data: eopVisible } = useChapterSetting('eop_visible');

  const isNewMember = profile?.status === 'new_member';
  const isVP = org.pdpOfficerTitles.some(t => profile?.positions?.includes(t));
  const showPDP = isNewMember || isVP;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Users, label: 'People', path: '/people' },
    { icon: Calendar, label: 'Events', path: '/events' },
    ...(showPDP ? [{ icon: GraduationCap, label: 'PDP', path: '/pdp' }] : []),
    { icon: Building, label: 'Chapter', path: '/chapter' },
    ...(eopVisible ? [{ icon: Vote, label: 'EOP', path: '/eop' }] : []),
  ];

  const bottomItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help', path: '/help' },
  ];

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`
    : '';

  const NavItem = ({ icon: Icon, label, path }: { icon: any; label: string; path: string }) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
          isActive
            ? 'bg-primary text-primary-foreground shadow-purple'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-card border-r border-border fixed left-0 top-0">
      {/* Logo & Notifications */}
      <div className="p-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">{org.greekLetters}</span>
          </div>
          <div>
            <h1 className="font-display font-semibold text-foreground">{org.name}</h1>
            <p className="text-xs text-muted-foreground">{org.chapterName}</p>
          </div>
        </Link>
        <NotificationBell />
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </nav>

      <Separator />

      {/* Bottom Navigation */}
      <div className="p-4 space-y-1">
        {bottomItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </div>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {initials || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
