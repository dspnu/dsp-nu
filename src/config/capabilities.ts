import { useMemo } from 'react';
import { org } from './org';

/** Keys of `org.features` — use for capability checks and SKU manifests. */
export type FeatureKey = keyof typeof org.features;

const ALL_KEYS = Object.keys(org.features) as FeatureKey[];

function parseDisabledFromEnv(): Set<FeatureKey> {
  const raw = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_DISABLED_FEATURES : undefined;
  if (!raw || typeof raw !== 'string') return new Set();
  const disabled = new Set<FeatureKey>();
  for (const part of raw.split(',')) {
    const k = part.trim() as FeatureKey;
    if (k && (org.features as Record<string, boolean>)[k] !== undefined) {
      disabled.add(k);
    }
  }
  return disabled;
}

const disabledByEnv = parseDisabledFromEnv();

function buildCapabilityMap(): Record<FeatureKey, boolean> {
  const out = {} as Record<FeatureKey, boolean>;
  for (const key of ALL_KEYS) {
    const base = org.features[key];
    out[key] = base && !disabledByEnv.has(key);
  }
  return out;
}

const capabilityMap = buildCapabilityMap();

/** Resolved enablement for each licensed feature (org.features minus build-time disables). */
export function getCapabilityMap(): Readonly<Record<FeatureKey, boolean>> {
  return capabilityMap;
}

export function isCapabilityEnabled(key: FeatureKey): boolean {
  return capabilityMap[key];
}

/** React hook — capability is static per build; useMemo keeps referential stability for consumers. */
export function useCapability(key: FeatureKey): boolean {
  return useMemo(() => capabilityMap[key], [key]);
}
