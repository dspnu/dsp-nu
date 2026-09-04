import { cn } from '@/lib/utils';
import { categoryLabels, type EventCategory } from '@/config/org';

interface CategoryBadgeProps {
  category: EventCategory | string;
  className?: string;
}

const categoryStyles: Record<string, string> = {
  chapter: 'bg-category-chapter/10 text-primary border-category-chapter/20',
  rush: 'bg-category-rush/10 text-amber-800 dark:text-amber-200 border-category-rush/20',
  fundraising: 'bg-category-fundraising/10 text-emerald-800 dark:text-emerald-200 border-category-fundraising/20',
  service: 'bg-category-service/10 text-sky-800 dark:text-sky-200 border-category-service/20',
  brotherhood: 'bg-category-brotherhood/10 text-rose-800 dark:text-rose-200 border-category-brotherhood/20',
  professionalism: 'bg-category-professionalism/10 text-orange-800 dark:text-orange-200 border-category-professionalism/20',
  dei: 'bg-category-dei/10 text-fuchsia-800 dark:text-fuchsia-200 border-category-dei/20',
  new_member: 'bg-purple-500/10 text-purple-800 dark:text-purple-200 border-purple-500/20',
  exec: 'bg-slate-500/10 text-slate-800 dark:text-slate-200 border-slate-500/20',
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
