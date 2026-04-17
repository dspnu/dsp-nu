import { cn } from '@/lib/utils';
import { copyrightLine } from '@/config/legal';
import { firmwareVersion } from '@/lib/appVersion';

export function AppCopyrightFooter({ className }: { className?: string }) {
  return (
    <div className={cn('text-center text-xs text-muted-foreground space-y-1', className)}>
      <p>{copyrightLine()}</p>
      <p>
        {firmwareVersion.firmwareLabel} {firmwareVersion.semver}
      </p>
    </div>
  );
}
