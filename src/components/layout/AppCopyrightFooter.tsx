import { cn } from '@/lib/utils';
import { copyrightLine } from '@/config/legal';

export function AppCopyrightFooter({ className }: { className?: string }) {
  return (
    <p className={cn('text-center text-xs text-muted-foreground', className)}>
      {copyrightLine()}
    </p>
  );
}
