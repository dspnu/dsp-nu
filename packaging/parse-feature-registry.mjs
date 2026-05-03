/**
 * Parse registerFeature({ ... }) blocks from src/config/featureRegistrations.ts
 * (no TypeScript runtime — keeps packaging scripts dependency-free).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const REG_PATH = path.join(REPO_ROOT, 'src/config/featureRegistrations.ts');

/**
 * @returns {{ key: string, paths: string[], dependsOn: string[] }[]}
 */
export function parseFeatureRegistry(registrationsPath = REG_PATH) {
  const content = fs.readFileSync(registrationsPath, 'utf8');
  const features = [];
  const prefix = 'registerFeature({';
  let i = 0;
  while (true) {
    const start = content.indexOf(prefix, i);
    if (start === -1) break;
    let pos = start + prefix.length;
    let depth = 1;
    while (pos < content.length && depth > 0) {
      const c = content[pos];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      pos++;
    }
    const inner = content.slice(start + prefix.length, pos - 1);
    const keyM = inner.match(/key:\s*'(\w+)'/);
    if (!keyM) {
      i = start + 1;
      continue;
    }
    const key = keyM[1];
    const paths = [];
    const pathsMatch = inner.match(/paths:\s*\[([\s\S]*?)\]/);
    if (pathsMatch) {
      for (const m of pathsMatch[1].matchAll(/'([^']+)'/g)) {
        paths.push(m[1]);
      }
    }
    const dependsOn = [];
    const depMatch = inner.match(/dependsOn:\s*\[([\s\S]*?)\]/);
    if (depMatch) {
      for (const m of depMatch[1].matchAll(/'(\w+)'/g)) {
        dependsOn.push(m[1]);
      }
    }
    features.push({ key, paths, dependsOn });
    const semi = content.indexOf(';', pos);
    i = semi === -1 ? pos : semi + 1;
  }
  return features;
}

export function expandDisabledKeys(features, userDisabled) {
  const disabled = new Set(userDisabled);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of features) {
      if (disabled.has(f.key)) continue;
      for (const d of f.dependsOn ?? []) {
        if (disabled.has(d)) {
          disabled.add(f.key);
          changed = true;
          break;
        }
      }
    }
  }
  return disabled;
}

/** Map src/features/<segment>/... -> feature key (last registered path wins). */
export function segmentToFeatureKey(features) {
  const map = new Map();
  for (const f of features) {
    for (const p of f.paths) {
      const m = p.match(/^src\/features\/([^/]+)/);
      if (m) map.set(m[1], f.key);
    }
  }
  return map;
}

export function featureKeyForSourceFile(features, filePath) {
  const norm = filePath.split(path.sep).join('/');
  for (const f of features) {
    for (const p of f.paths) {
      const pref = p.split('/').join('/');
      if (norm === pref || norm.startsWith(`${pref}/`)) return f.key;
    }
  }
  const fm = norm.match(/^src\/features\/([^/]+)/);
  if (!fm) return null;
  const seg = fm[1];
  return segmentToFeatureKey(features).get(seg) ?? null;
}
