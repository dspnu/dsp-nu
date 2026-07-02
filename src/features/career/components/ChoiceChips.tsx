import { cn } from '@/lib/utils';

interface ChoiceChipsProps<T extends string> {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function ChoiceChips<T extends string>({
  options, value, onChange, disabled, size = 'md',
}: ChoiceChipsProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border transition-all',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-background text-foreground border-border hover:bg-muted',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
