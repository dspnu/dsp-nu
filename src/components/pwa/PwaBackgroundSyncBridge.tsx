import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getPeriodicSyncEnabled,
  registerDeferredBackgroundSync,
  registerPeriodicContentSync,
  supportsBackgroundSync,
} from '@/lib/pwaAdvancedFeatures';

/**
 * Re-applies periodic sync after load when the user opted in, registers Background Sync
 * when the device comes online, and refreshes client cache after SW background work completes.
 */
export function PwaBackgroundSyncBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
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
    if (!supportsBackgroundSync()) return;
    const onOnline = () => {
      void registerDeferredBackgroundSync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return null;
}
