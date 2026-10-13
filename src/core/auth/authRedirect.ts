import { Capacitor } from '@capacitor/core';
import { org } from '@/config/org';

/** OAuth, email confirmation, and password recovery all return here. */
export function getAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) return 'dspnu://auth/callback';
  const origin = window.location.origin.replace(/\/$/, '');
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return isLocal ? `${origin}/auth/callback` : `https://${org.domain}/auth/callback`;
}
