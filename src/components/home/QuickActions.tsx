import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Coffee, Briefcase, QrCode } from 'lucide-react';

const actions = [
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Users, label: 'People', path: '/people' },
  { icon: Coffee, label: 'Coffee Chats', path: '/chapter' },
  { icon: Briefcase, label: 'Job Board', path: '/chapter' },
];

export function QuickActions() {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick Actions</span>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {actions.map(({ icon: Icon, label, path }) => (
          <Link key={label} to={path} className="w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 sm:h-9 gap-2 w-full sm:w-auto bg-card hover:bg-muted/50 border-border/60 text-sm"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
