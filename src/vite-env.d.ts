/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** VAPID public key (URL-safe base64) for Web Push subscription */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  /** Optional HTTPS endpoint to POST push subscription JSON (your backend) */
  readonly VITE_PUSH_SUBSCRIPTION_URL?: string;
  /** Optional override for app/firmware semantic version */
  readonly VITE_APP_VERSION?: string;
  /** Base URL of the wallet-pass-service (no trailing slash), e.g. https://wallet.example.com */
  readonly VITE_WALLET_PASS_URL?: string;
  /** Comma-separated org.features keys to force off at build time (see src/config/capabilities.ts). */
  readonly VITE_DISABLED_FEATURES?: string;
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

declare const __APP_VERSION__: string;
