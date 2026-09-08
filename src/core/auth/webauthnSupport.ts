import { Capacitor } from '@capacitor/core';

/** True when the current surface can run a browser WebAuthn ceremony. */
export function canUsePasskeys(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return false;
  return typeof window.PublicKeyCredential === 'function';
}

export function isPasskeyCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const name = error instanceof Error ? error.name : '';
  return (
    name === 'NotAllowedError' ||
    /cancelled|canceled|abort|timed out|notallowed/i.test(message)
  );
}

export function passkeyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Passkey failed');
  if (/passkey_disabled/i.test(message) || /not enabled/i.test(message)) {
    return 'Passkeys are not enabled on this project yet. Turn them on in Supabase: Authentication → Passkeys.';
  }
  return message;
}
