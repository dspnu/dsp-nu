import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Fetch a ticket .pkpass and hand it to Wallet.
 * Native Capacitor: write temp file + Share sheet (WKWebView cannot open blob .pkpass reliably).
 * Web: navigate to a blob URL (Safari/PWA).
 */
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

  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);
    const fileName = `BrotherhoodTicket-${ticketId}.pkpass`;
    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    try {
      await Share.share({
        title: 'Add to Apple Wallet',
        url: written.uri,
        dialogTitle: 'Add pass to Apple Wallet',
      });
    } finally {
      try {
        await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
      } catch {
        /* ignore cleanup errors */
      }
    }
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  window.location.assign(objectUrl);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
}

/** Open the wallet pass service health/docs in the system browser (debug). */
export async function openWalletPassServiceInBrowser(): Promise<void> {
  const base = walletPassBaseUrl();
  if (!base) return;
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: base, windowName: '_system' });
  } else {
    window.open(base, '_blank', 'noopener,noreferrer');
  }
}
