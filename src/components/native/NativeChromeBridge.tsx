import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useTheme } from 'next-themes';

/**
 * Syncs iOS status bar style with the app theme and configures keyboard resize behavior.
 */
export function NativeChromeBridge() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        const dark = resolvedTheme === 'dark';
        await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: dark ? '#0c0a09' : '#faf9f7' });
      } catch (e) {
        if (!cancelled) console.warn('StatusBar setup failed:', e);
      }

      try {
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
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
