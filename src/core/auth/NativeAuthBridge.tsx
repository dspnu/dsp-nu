import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { resolveInviteUnlockAfterAuth } from '@/core/auth/inviteUnlock';
import { isDemoMode } from '@/demo';

function parseTokensFromUrl(rawUrl: string): { access_token: string; refresh_token: string } | null {
  const url = new URL(rawUrl);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (!accessToken || !refreshToken) return null;
  return { access_token: accessToken, refresh_token: refreshToken };
}

function parseCodeFromUrl(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  return url.searchParams.get('code');
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
 * Capacitor-only: handles OAuth / password-recovery redirects back into the native app.
 * Web auth continues to use /auth/callback.
 */
export function NativeAuthBridge() {
  useEffect(() => {
    if (isDemoMode() || !Capacitor.isNativePlatform()) return;

    const subPromise = App.addListener('appUrlOpen', async ({ url }) => {
      if (!url?.startsWith('dspnu://')) return;

      const error = parseErrorFromUrl(url);
      if (error) {
        console.error('OAuth redirect error:', error);
        try {
          await Browser.close();
        } catch {
          /* ignore */
        }
        return;
      }

      const callbackType = parseCallbackType(url);
      const tokens = parseTokensFromUrl(url);
      const code = parseCodeFromUrl(url);

      try {
        if (tokens) {
          await supabase.auth.setSession(tokens);
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          return;
        }

        if (callbackType === 'recovery') {
          window.location.href = '/auth/reset-password';
        } else {
          const unlock = await resolveInviteUnlockAfterAuth();
          if (unlock === 'locked') {
            window.location.href = '/auth/invite';
          }
        }
      } catch (e) {
        console.error('Native auth callback failed:', e);
      } finally {
        try {
          await Browser.close();
        } catch {
          /* ignore */
        }
      }
    });

    return () => {
      subPromise.then((sub) => sub.remove()).catch(() => {});
    };
  }, []);

  return null;
}
