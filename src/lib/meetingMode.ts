import { useSyncExternalStore } from 'react';

/**
 * Reference-counted "meeting mode" flag.
 * While active, background Realtime / full-cache invalidations should stay quiet.
 */
let refCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return refCount > 0;
}

export function enterMeetingMode() {
  refCount += 1;
  emit();
}

export function exitMeetingMode() {
  refCount = Math.max(0, refCount - 1);
  emit();
}

export function isMeetingModeActive() {
  return refCount > 0;
}

export function useMeetingMode() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
