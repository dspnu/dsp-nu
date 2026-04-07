import { Link } from 'react-router-dom';
import { Calendar, Users, Coffee, Briefcase } from 'lucide-react';

const actions = [
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Users, label: 'People', path: '/people' },
  { icon: Coffee, label: 'Coffee Chats', path: '/chapter' },
  { icon: Briefcase, label: 'Jobs', path: '/chapter' },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ icon: Icon, label, path }) => (
        <Link
          key={label}
          to={path}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/20 active:scale-95 transition-all text-center"
        >
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        </Link>
      ))}
    </div>
  );
}
