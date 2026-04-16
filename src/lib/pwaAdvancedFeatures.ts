import { PWA_BACKGROUND_SYNC_TAG, PWA_PERIODIC_SYNC_TAG } from '@/lib/pwaServiceWorkerTags';

const PERIODIC_LS_KEY = 'dsp_pwa_periodic_sync_enabled';

export function getPeriodicSyncEnabled(): boolean {
  try {
    return localStorage.getItem(PERIODIC_LS_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPeriodicSyncEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(PERIODIC_LS_KEY, '1');
    else localStorage.removeItem(PERIODIC_LS_KEY);
  } catch {
    /* ignore */
  }
}

export function supportsPeriodicBackgroundSync(): boolean {
  return 'serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype;
}

export function supportsBackgroundSync(): boolean {
  return 'serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype;
}

export function supportsWebPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Minimum interval between periodic sync runs (browser may enforce a higher minimum). */
const PERIODIC_MIN_INTERVAL_MS = 12 * 60 * 60 * 1000;

export async function registerPeriodicContentSync(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.periodicSync) return;
  await reg.periodicSync.register(PWA_PERIODIC_SYNC_TAG, { minInterval: PERIODIC_MIN_INTERVAL_MS });
}

export async function unregisterPeriodicContentSync(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.periodicSync) return;
  await reg.periodicSync.unregister(PWA_PERIODIC_SYNC_TAG);
}

/**
 * Registers a one-shot Background Sync task. The browser runs it when connectivity is stable
 * (typically after the device has been offline and comes back online).
 */
export async function registerDeferredBackgroundSync(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.sync) return;
  await reg.sync.register(PWA_BACKGROUND_SYNC_TAG);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const PUSH_SUB_LS = 'dsp_push_subscription_json';

export async function subscribeToWebPush(vapidPublicKey: string): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  const key = urlBase64ToUint8Array(vapidPublicKey);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  try {
    localStorage.setItem(PUSH_SUB_LS, JSON.stringify(sub.toJSON()));
  } catch {
    /* ignore */
  }

  const endpoint = import.meta.env.VITE_PUSH_SUBSCRIPTION_URL?.trim();
  if (endpoint) {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
      credentials: 'include',
    }).catch(() => {
      /* optional server registration */
    });
  }

  return sub;
}

export async function unsubscribeFromWebPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
  try {
    localStorage.removeItem(PUSH_SUB_LS);
  } catch {
    /* ignore */
  }
}
