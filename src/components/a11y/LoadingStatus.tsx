import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStatusProps {
  label?: string;
  className?: string;
  iconClassName?: string;
}

export function LoadingStatus({
  label = 'Loading',
  className,
  iconClassName,
}: LoadingStatusProps) {
  return (
    <div role="status" aria-live="polite" className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn('h-6 w-6 animate-spin text-primary', iconClassName)} aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
