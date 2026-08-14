import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { pingSupabaseHealth } from '@/lib/supabaseHealth';
import { useMeetingMode } from '@/lib/meetingMode';
import { isDemoMode } from '@/demo';

/**
 * Soft connectivity banner — does not wipe app state; just warns during blips.
 */
export function ConnectivityBanner() {
  const meetingMode = useMeetingMode();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    if (isDemoMode()) return;
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (isDemoMode() || offline) return;
    let cancelled = false;

    const check = async () => {
      const result = await pingSupabaseHealth();
      if (!cancelled) {
        setDegraded(!result.ok || result.latencyMs >= 3000);
      }
    };

    void check();
    const ms = meetingMode ? 15000 : 45000;
    const id = window.setInterval(() => void check(), ms);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [offline, meetingMode]);

  if (isDemoMode() || (!offline && !degraded)) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 border-b border-amber-500/30 bg-amber-500/15 px-3 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" />
        {offline
          ? 'You appear offline. Votes may fail until connection returns.'
          : 'Connection is slow or unstable. Live updates may lag — try again in a moment before opening the next vote.'}
      </span>
    </div>
  );
}
