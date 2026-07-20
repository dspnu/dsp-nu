import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { MouseEvent as ReactMouseEvent } from 'react';

/**
 * Open an http(s) URL outside the app shell.
 * On Capacitor native, uses the system browser (SFSafariViewController / Custom Tabs).
 * On web, uses window.open.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const trimmed = url?.trim();
  if (!trimmed) return;

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: trimmed, windowName: '_system' });
    return;
  }

  window.open(trimmed, '_blank', 'noopener,noreferrer');
}

/**
 * Click handler for anchor-like elements. Prevents default navigation on native
 * and opens via Browser instead.
 */
export function handleExternalLinkClick(
  event: ReactMouseEvent<HTMLAnchorElement> | MouseEvent,
  url?: string | null
): void {
  const href =
    url?.trim() ||
    (event.currentTarget instanceof HTMLAnchorElement
      ? event.currentTarget.href
      : null);
  if (!href || href.startsWith('javascript:')) return;

  if (Capacitor.isNativePlatform()) {
    event.preventDefault();
    void openExternalUrl(href);
  }
}

/**
 * Subscribe once for browserFinished — useful after Clover checkout so callers can refresh.
 * Returns an unsubscribe function.
 */
export async function onExternalBrowserFinished(callback: () => void): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }
  const handle = await Browser.addListener('browserFinished', callback);
  return () => {
    void handle.remove();
  };
}
