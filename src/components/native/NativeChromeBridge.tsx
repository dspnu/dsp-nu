import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from 'next-themes';

/**
 * Syncs iOS status bar / keyboard with the web UI.
 * Status bar overlays the WebView; safe areas are applied in CSS so
 * position:fixed chrome (bottom nav) does not scroll with the page.
 *
 * Capacitor Style naming is inverted from CSS:
 * - Style.Dark  → light/white status-bar content (for dark backgrounds)
 * - Style.Light → dark status-bar content (for light backgrounds)
 */
export function NativeChromeBridge() {
  const { resolvedTheme } = useTheme();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;
    if (resolvedTheme !== 'dark' && resolvedTheme !== 'light') return;

    let cancelled = false;

    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        const dark = resolvedTheme === 'dark';
        await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
        // Only applies when overlay is false; kept for Android / future toggles.
        await StatusBar.setBackgroundColor({ color: dark ? '#0c0a09' : '#faf9f7' });
      } catch (e) {
        if (!cancelled) console.warn('StatusBar setup failed:', e);
      }

      try {
        await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
      } catch (e) {
        if (!cancelled) console.warn('Keyboard setup failed:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolvedTheme, isNative]);

  if (!isNative) return null;

  // Opaque strip so page content cannot scroll under the status bar icons.
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[45] h-[env(safe-area-inset-top,0px)] bg-background pointer-events-none"
    />
  );
}
