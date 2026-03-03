import { cn } from '@/lib/utils';

type EventCategory = 'chapter' | 'rush' | 'fundraising' | 'service' | 'brotherhood' | 'professionalism' | 'dei' | 'new_member';

interface CategoryBadgeProps {
  category: EventCategory;
  className?: string;
}

const categoryConfig: Record<EventCategory, { label: string; className: string }> = {
  chapter: {
    label: 'Chapter',
    className: 'bg-category-chapter/10 text-category-chapter border-category-chapter/20',
  },
  rush: {
    label: 'Rush',
    className: 'bg-category-rush/10 text-category-rush border-category-rush/20',
  },
  fundraising: {
    label: 'Fundraising',
    className: 'bg-category-fundraising/10 text-category-fundraising border-category-fundraising/20',
  },
  service: {
    label: 'Service',
    className: 'bg-category-service/10 text-category-service border-category-service/20',
  },
  brotherhood: {
    label: 'Brotherhood',
    className: 'bg-category-brotherhood/10 text-category-brotherhood border-category-brotherhood/20',
  },
  professionalism: {
    label: 'Professionalism',
    className: 'bg-category-professionalism/10 text-category-professionalism border-category-professionalism/20',
  },
  dei: {
    label: 'DE&I',
    className: 'bg-category-dei/10 text-category-dei border-category-dei/20',
  },
  new_member: {
    label: 'New Member',
    className: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  },
};

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = categoryConfig[category];
  
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
