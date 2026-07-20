import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getPeriodicSyncEnabled,
  registerDeferredBackgroundSync,
  registerPeriodicContentSync,
  supportsBackgroundSync,
} from '@/lib/pwaAdvancedFeatures';
import { isNativeApp } from '@/lib/nativePush';

/**
 * Re-applies periodic sync after load when the user opted in, registers Background Sync
 * when the device comes online, and refreshes client cache after SW background work completes.
 * No-op inside Capacitor native shells.
 */
export function PwaBackgroundSyncBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isNativeApp()) return;
    const onMessage = (event: MessageEvent) => {
      const t = event.data?.type;
      if (t === 'DSP_PERIODIC_SYNC_COMPLETE' || t === 'DSP_BACKGROUND_SYNC_COMPLETE') {
        void queryClient.invalidateQueries();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [queryClient]);

  useEffect(() => {
    if (isNativeApp()) return;
    if (!getPeriodicSyncEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        const perm = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        if (cancelled) return;
        if (perm.state === 'denied') return;
        await registerPeriodicContentSync();
      } catch {
        if (!cancelled) await registerPeriodicContentSync().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isNativeApp()) return;
    if (!supportsBackgroundSync()) return;
    const onOnline = () => {
      void registerDeferredBackgroundSync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return null;
}
