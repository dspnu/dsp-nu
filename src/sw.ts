/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

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

registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);

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
