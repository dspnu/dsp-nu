import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type PwaIncomingFilePayload,
  PWA_INCOMING_FILES_KEY,
} from '@/lib/pwaIncomingStorage';

/**
 * Handles `window.launchQueue` for file_handlers and coalesced launches.
 * Stores payloads in sessionStorage and routes to `/pwa-open` for a consistent UX.
 */
export function PwaLaunchBridge() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    if (typeof window === 'undefined' || !('launchQueue' in window) || !window.launchQueue) {
      return;
    }

    window.launchQueue.setConsumer(async (launchParams) => {
      const files = launchParams.files;
      if (!files?.length) {
        return;
      }

      const payloads: PwaIncomingFilePayload[] = [];

      for (const handle of files) {
        const file = await handle.getFile();
        const lower = file.name.toLowerCase();

        if (lower.endsWith('.ics')) {
          payloads.push({ name: file.name, kind: 'ics', text: await file.text() });
        } else if (lower.endsWith('.csv')) {
          payloads.push({ name: file.name, kind: 'csv', text: await file.text() });
        } else if (lower.endsWith('.pdf')) {
          const objectUrl = URL.createObjectURL(file);
          payloads.push({ name: file.name, kind: 'pdf', objectUrl });
        } else {
          const text = await file.text().catch(() => undefined);
          payloads.push({ name: file.name, kind: 'unknown', text });
        }
      }

      try {
        sessionStorage.setItem(PWA_INCOMING_FILES_KEY, JSON.stringify(payloads));
      } catch {
        return;
      }

      const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (path.startsWith('/pwa-open')) {
        window.dispatchEvent(new Event('pwa-incoming-files'));
        return;
      }

      navigateRef.current('/pwa-open');
    });
  }, []);

  return null;
}
