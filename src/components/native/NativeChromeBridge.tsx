import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from 'next-themes';

/**
 * Syncs iOS status bar / keyboard with the web UI.
 * Status bar overlays the WebView; safe areas are applied in CSS so
 * position:fixed chrome (bottom nav) does not scroll with the page.
 */
export function NativeChromeBridge() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        const dark = resolvedTheme === 'dark';
        // Light content on dark bg, dark content on light bg
        await StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark });
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
  }, [resolvedTheme]);

  return null;
}
