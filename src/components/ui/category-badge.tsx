import { cn } from '@/lib/utils';
import { categoryLabels, type EventCategory } from '@/config/org';

interface CategoryBadgeProps {
  category: EventCategory | string;
  className?: string;
}

const categoryStyles: Record<string, string> = {
  chapter: 'bg-category-chapter/10 text-category-chapter border-category-chapter/20',
  rush: 'bg-category-rush/10 text-category-rush border-category-rush/20',
  fundraising: 'bg-category-fundraising/10 text-category-fundraising border-category-fundraising/20',
  service: 'bg-category-service/10 text-category-service border-category-service/20',
  brotherhood: 'bg-category-brotherhood/10 text-category-brotherhood border-category-brotherhood/20',
  professionalism: 'bg-category-professionalism/10 text-category-professionalism border-category-professionalism/20',
  dei: 'bg-category-dei/10 text-category-dei border-category-dei/20',
  new_member: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  exec: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
};

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const style = categoryStyles[category] || 'bg-muted text-muted-foreground border-border';
  const label = categoryLabels[category] || category;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
