import { supabase } from '@/integrations/supabase/client';

function walletPassBaseUrl(): string | null {
  const raw = import.meta.env.VITE_WALLET_PASS_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

export function isAppleWalletPassConfigured(): boolean {
  return walletPassBaseUrl() !== null;
}

/** Rough check for iPhone / iPad (including iPadOS desktop UA). */
export function isLikelyIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

export async function downloadBrotherhoodTicketPass(ticketId: string): Promise<void> {
  const base = walletPassBaseUrl();
  if (!base) {
    throw new Error('Wallet pass URL is not configured');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('You must be signed in to add a pass');
  }

  const url = `${base}/wallet/tickets/${encodeURIComponent(ticketId)}/pass`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.location.assign(objectUrl);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}
