import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Coffee, Briefcase, QrCode } from 'lucide-react';

const actions = [
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Users, label: 'People', path: '/people' },
  { icon: Coffee, label: 'Coffee Chats', path: '/development' },
  { icon: Briefcase, label: 'Job Board', path: '/development' },
];

export function QuickActions() {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick Actions</span>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ icon: Icon, label, path }) => (
          <Link key={label} to={path}>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-2 bg-card hover:bg-muted/50 border-border/60"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
