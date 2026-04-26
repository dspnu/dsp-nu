import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

function parseTokensFromUrl(rawUrl: string): { access_token: string; refresh_token: string } | null {
  // Supabase returns tokens in the URL fragment for implicit flow
  // and can also return errors via query params / fragment.
  const url = new URL(rawUrl);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { access_token: accessToken, refresh_token: refreshToken };
}

function parseCallbackType(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  const params = new URLSearchParams(url.search);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  return params.get('type') ?? hashParams.get('type');
}

function parseErrorFromUrl(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  const params = new URLSearchParams(url.search);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const err =
    params.get('error_description') ??
    params.get('error') ??
    hashParams.get('error_description') ??
    hashParams.get('error');
  return err ? decodeURIComponent(err) : null;
}

/**
 * Capacitor-only: handles OAuth redirects back into the native app.
 * This keeps web auth flow unchanged (still uses /auth/callback route).
 */
export function NativeAuthBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const sub = App.addListener('appUrlOpen', async ({ url }) => {
      // Only handle our custom scheme.
      if (!url?.startsWith('dspnu://')) return;

      const error = parseErrorFromUrl(url);
      if (error) {
        // Surface errors in the console; UI feedback is handled by the auth page once it becomes active.
        console.error('OAuth redirect error:', error);
        try {
          await Browser.close();
        } catch {
          /* ignore */
        }
        return;
      }

      const tokens = parseTokensFromUrl(url);
      if (!tokens) return;
      const callbackType = parseCallbackType(url);

      try {
        await supabase.auth.setSession(tokens);
        if (callbackType === 'recovery') {
          window.location.href = '/auth/reset-password';
        }
      } finally {
        try {
          await Browser.close();
        } catch {
          /* ignore */
        }
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  return null;
}

