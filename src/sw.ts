/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { PWA_BACKGROUND_SYNC_TAG, PWA_PERIODIC_SYNC_TAG } from './lib/pwaServiceWorkerTags';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[];
};

type WidgetsApi = {
  updateByInstanceId?: (
    instanceId: string,
    payload: { template?: string; data?: unknown; payload?: unknown }
  ) => Promise<void>;
};

type WidgetLike = { definition?: { data?: string; template?: string; tag?: string } };
type WidgetInstallEvent = ExtendableEvent & {
  widget?: WidgetLike;
  instanceId?: string;
};
type WidgetClickEvent = ExtendableEvent & {
  action?: string;
};

function getWidgetsApi(): WidgetsApi | undefined {
  return (self as unknown as { widgets?: WidgetsApi }).widgets;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  void clientsClaim();
});

precacheAndRoute(self.__WB_MANIFEST);

const fileExtensionPattern = /\/[^/?]+\.[^/]+$/;
const navigationRoute = new NavigationRoute(createHandlerBoundToURL('/index.html'), {
  denylist: [/^\/_/, /^\/~oauth/, fileExtensionPattern],
});
registerRoute(navigationRoute);

registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/auth/v1/'),
  new NetworkOnly()
);

registerRoute(
  ({ url }) =>
    url.hostname.endsWith('.supabase.co') &&
    /\/rest\/v1\/(election_votes|election_positions|election_candidates|elections)/.test(url.pathname),
  new NetworkOnly()
);

const supabaseBgSync = new BackgroundSyncPlugin('supabase-failed-requests', {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24,
      }),
      supabaseBgSync,
    ],
  })
);

const PERIODIC_CACHE = 'dsp-periodic-precache';

async function refreshPeriodicContent(): Promise<void> {
  const cache = await caches.open(PERIODIC_CACHE);
  const paths = ['/pwa-widgets/glance.data.json'];
  await Promise.all(
    paths.map(async (path) => {
      const url = new URL(path, self.location.origin).href;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) await cache.put(url, res.clone());
      } catch {
        /* offline or unreachable */
      }
    })
  );
}

self.addEventListener('periodicsync', (event: ExtendableEvent) => {
  const tag = (event as ExtendableEvent & { tag: string }).tag;
  if (tag !== PWA_PERIODIC_SYNC_TAG) return;
  event.waitUntil(
    (async () => {
      await refreshPeriodicContent();
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clients) {
        c.postMessage({ type: 'DSP_PERIODIC_SYNC_COMPLETE' });
      }
    })()
  );
});

self.addEventListener('sync', (event: ExtendableEvent) => {
  const tag = (event as ExtendableEvent & { tag: string }).tag;
  if (tag !== PWA_BACKGROUND_SYNC_TAG) return;
  event.waitUntil(
    (async () => {
      await refreshPeriodicContent();
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clients) {
        c.postMessage({ type: 'DSP_BACKGROUND_SYNC_COMPLETE' });
      }
    })()
  );
});

self.addEventListener('push', (event: ExtendableEvent) => {
  const pe = event as PushEvent;
  let payload: { title?: string; body?: string; url?: string; icon?: string } = {};
  try {
    if (pe.data) {
      const text = pe.data.text();
      payload = text ? (JSON.parse(text) as typeof payload) : {};
    }
  } catch {
    try {
      if (pe.data) payload = { body: pe.data.text() ?? undefined };
    } catch {
      /* ignore */
    }
  }

  const title = payload.title ?? 'Chapter Portal';
  const url = payload.url ?? '/notifications';
  const options: NotificationOptions = {
    body: payload.body ?? 'You have a new update',
    icon: payload.icon ?? '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'dsp-notification',
    renotify: true,
    data: { url },
  };

  pe.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const raw = event.notification.data;
  const url =
    typeof raw === 'object' && raw !== null && 'url' in raw && typeof (raw as { url?: string }).url === 'string'
      ? (raw as { url: string }).url
      : '/notifications';
  const target = new URL(url, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin)) continue;
        const w = client as WindowClient;
        if ('navigate' in w && typeof w.navigate === 'function') {
          await w.navigate(target);
          return w.focus();
        }
        if ('focus' in w) return w.focus();
      }
      const opened = await self.clients.openWindow(target);
      return opened?.focus();
    })()
  );
});

async function fetchWidgetData(dataPath: string): Promise<unknown> {
  const url = new URL(dataPath, self.location.origin);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Widget data ${dataPath} failed: ${res.status}`);
  return res.json();
}

self.addEventListener('widgetinstall', (event: Event) => {
  const e = event as WidgetInstallEvent;
  const widgetsApi = getWidgetsApi();
  if (!widgetsApi?.updateByInstanceId || !e.instanceId || !e.widget?.definition?.data) {
    return;
  }
  e.waitUntil(
    (async () => {
      try {
        const data = await fetchWidgetData(e.widget!.definition!.data!);
        await widgetsApi.updateByInstanceId!(e.instanceId!, {
          template: e.widget!.definition!.template,
          data,
        });
      } catch {
        /* Widget host may still show placeholder */
      }
    })()
  );
});

self.addEventListener('widgetresume', (event: Event) => {
  const widgetsApi = getWidgetsApi();
  const updateByTag = (widgetsApi as unknown as { updateByTag?: (tag: string, payload: { data?: unknown }) => Promise<void> })
    ?.updateByTag;
  if (!updateByTag) return;
  const e = event as ExtendableEvent;
  e.waitUntil(
    (async () => {
      try {
        const data = await fetchWidgetData('/pwa-widgets/glance.data.json');
        await updateByTag('chapter-glance', { data });
      } catch {
        /* optional refresh */
      }
    })()
  );
});

self.addEventListener('widgetclick', (event: Event) => {
  const e = event as WidgetClickEvent;
  const action = e.action;
  if (!action) return;

  const paths: Record<string, string> = {
    events: '/events',
    members: '/people',
    home: '/',
    notifications: '/notifications',
  };
  const path = paths[action];
  if (!path) return;

  const url = `${self.location.origin}${path}`;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
      for (const client of clients) {
        if (!client.url.startsWith(self.location.origin)) continue;
        const wc = client as WindowClient;
        if ('navigate' in wc && typeof wc.navigate === 'function') {
          await wc.navigate(url);
          return wc.focus();
        }
      }
      const opened = await self.clients.openWindow(url);
      return opened?.focus();
    })
  );
});
