import { cn } from '@/lib/utils';

type MemberStatus = 'active' | 'alumni' | 'inactive' | 'new_member' | 'pnm';

interface StatusBadgeProps {
  status: MemberStatus;
  className?: string;
}

const statusConfig: Record<MemberStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  },
  alumni: {
    label: 'Alumni',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  new_member: {
    label: 'New Member',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  pnm: {
    label: 'PNM',
    className: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
