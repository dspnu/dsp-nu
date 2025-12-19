import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  Award,
  Clock,
  Briefcase,
  GraduationCap,
  Coffee,
  LayoutDashboard,
  Vote,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

const coreNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Members', path: '/members' },
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Award, label: 'Points', path: '/points' },
  { icon: Clock, label: 'Service Hours', path: '/service-hours' },
];

const networkNavItems = [
  { icon: GraduationCap, label: 'Alumni', path: '/alumni' },
  { icon: Briefcase, label: 'Job Board', path: '/jobs' },
  { icon: Coffee, label: 'Coffee Chats', path: '/coffee-chats' },
];

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Admin Dashboard', path: '/admin' },
  { icon: Vote, label: 'EOP Voting', path: '/eop' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
];

export function DesktopSidebar() {
  const location = useLocation();
  const { profile, signOut, isAdminOrOfficer } = useAuth();
  const [networkOpen, setNetworkOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`
    : '';

  const isNetworkActive = networkNavItems.some(item => location.pathname === item.path);
  const isAdminActive = adminNavItems.some(item => location.pathname === item.path);

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
      {/* Logo */}
      <div className="p-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">ΔΣΠ</span>
          </div>
          <div>
            <h1 className="font-display font-semibold text-foreground">Delta Sigma Pi</h1>
            <p className="text-xs text-muted-foreground">Nu Chapter</p>
          </div>
        </Link>
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Core Items */}
        {coreNavItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}

        {/* Network Section */}
        <Collapsible open={networkOpen} onOpenChange={setNetworkOpen} className="mt-4">
          <CollapsibleTrigger className={cn(
            'flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors',
            isNetworkActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}>
            Network
            <ChevronDown className={cn('h-4 w-4 transition-transform', networkOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {networkNavItems.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Admin Section - Only for admins/officers */}
        {isAdminOrOfficer && (
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen} className="mt-4">
            <CollapsibleTrigger className={cn(
              'flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors',
              isAdminActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}>
              Admin
              <ChevronDown className={cn('h-4 w-4 transition-transform', adminOpen && 'rotate-180')} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {adminNavItems.map((item) => (
                <NavItem key={item.path} {...item} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
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
        <div className="flex items-center gap-3 mb-3">
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
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
