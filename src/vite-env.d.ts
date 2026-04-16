/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** VAPID public key (URL-safe base64) for Web Push subscription */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /** Optional HTTPS endpoint to POST push subscription JSON (your backend) */
  readonly VITE_PUSH_SUBSCRIPTION_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Chromium: Periodic Background Sync */
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval?: number }): Promise<void>;
  getTags(): Promise<string[]>;
  unregister(tag: string): Promise<void>;
}

/** Background Sync API (Chromium) */
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly periodicSync?: PeriodicSyncManager;
  readonly sync?: SyncManager;
}
