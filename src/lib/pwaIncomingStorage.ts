/** Session keys for PWA file / launch flows (file_handlers + launchQueue). */

export const PWA_INCOMING_FILES_KEY = 'dsp.nu.pwa.incomingFiles.v1';

export type PwaIncomingFilePayload = {
  name: string;
  kind: 'ics' | 'csv' | 'pdf' | 'unknown';
  text?: string;
  objectUrl?: string;
};

export function readIncomingFilePayloads(): PwaIncomingFilePayload[] | null {
  try {
    const raw = sessionStorage.getItem(PWA_INCOMING_FILES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PwaIncomingFilePayload[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearIncomingFilePayloads() {
  sessionStorage.removeItem(PWA_INCOMING_FILES_KEY);
}
