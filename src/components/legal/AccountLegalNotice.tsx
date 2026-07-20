import { legal } from '@/config/legal';
import { cn } from '@/lib/utils';
import { ExternalLink } from '@/components/ExternalLink';

const linkClass = 'text-primary underline-offset-2 hover:underline font-medium';

/**
 * Shown on sign-in / sign-up: by using the app, users agree to hosted legal terms.
 */
export function AccountLegalNotice({ className }: { className?: string }) {
  return (
    <p className={cn('text-center text-[11px] sm:text-xs text-muted-foreground leading-relaxed', className)}>
      By continuing, you agree to our{' '}
      <ExternalLink href={legal.eulaUrl} className={linkClass}>
        End User License Agreement (EULA)
      </ExternalLink>
      ,{' '}
      <ExternalLink href={legal.termsUrl} className={linkClass}>
        Terms of Service
      </ExternalLink>
      ,{' '}
      <ExternalLink href={legal.privacyUrl} className={linkClass}>
        Privacy Policy
      </ExternalLink>
      , and{' '}
      <ExternalLink href={legal.cookiesUrl} className={linkClass}>
        Cookie Policy
      </ExternalLink>
      .
    </p>
  );
}
