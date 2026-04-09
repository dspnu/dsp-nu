import { legal } from '@/config/legal';
import { cn } from '@/lib/utils';

const linkClass = 'text-primary underline-offset-2 hover:underline font-medium';

/**
 * Shown on sign-in / sign-up: by using the app, users agree to hosted legal terms.
 */
export function AccountLegalNotice({ className }: { className?: string }) {
  return (
    <p className={cn('text-center text-[11px] sm:text-xs text-muted-foreground leading-relaxed', className)}>
      By continuing, you agree to our{' '}
      <a href={legal.eulaUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
        End User License Agreement (EULA)
      </a>
      ,{' '}
      <a href={legal.termsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Terms of Service
      </a>
      , and{' '}
      <a href={legal.privacyUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Privacy Policy
      </a>
      .
    </p>
  );
}
