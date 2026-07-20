import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { handleExternalLinkClick } from '@/lib/openExternalUrl';
import { cn } from '@/lib/utils';

type ExternalLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'> & {
  href: string;
  children: ReactNode;
};

/**
 * Anchor that opens in the system browser on Capacitor native, and a new tab on web.
 */
export function ExternalLink({ href, children, className, onClick, ...rest }: ExternalLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    handleExternalLinkClick(event, href);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(className)}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </a>
  );
}
