/**
 * 1) Licensed feature -> licensed feature imports must respect dependsOn (transitive).
 * 2) src/core and src/pages may not import @/features/* except App.tsx, featureRegistrations.ts,
 *    and paths listed in audit-core-pages-allowlist.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseFeatureRegistry,
  segmentToFeatureKey,
  featureKeyForSourceFile,
  expandDisabledKeys,
} from './parse-feature-registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const ENTRYPOINTS = new Set([
  path.join(REPO_ROOT, 'src/App.tsx'),
  path.join(REPO_ROOT, 'src/config/featureRegistrations.ts'),
]);

const ALLOWLIST_PATH = path.join(__dirname, 'audit-core-pages-allowlist.json');

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return new Set();
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  const arr = raw.coreAndPagesFeatureImports ?? [];
  return new Set(arr.map((p) => path.resolve(REPO_ROOT, p)));
}

const IMPORT_RE = /from\s+['"]@\/features\/([^/'"]+)/g;

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === 'dist') continue;
      walkTsFiles(full, out);
    } else if (/\.(tsx|ts)$/.test(name.name)) {
      out.push(full);
    }
  }
  return out;
}

function buildTransitiveDeps(features) {
  const byKey = Object.fromEntries(features.map((f) => [f.key, f.dependsOn ?? []]));
  const memo = new Map();

  function depsOf(k) {
    if (memo.has(k)) return memo.get(k);
    const acc = new Set();
    const stack = [...(byKey[k] ?? [])];
    while (stack.length) {
      const d = stack.pop();
      if (acc.has(d)) continue;
      acc.add(d);
      for (const x of byKey[d] ?? []) stack.push(x);
    }
    memo.set(k, acc);
    return acc;
  }
  return depsOf;
}

function main() {
  const features = parseFeatureRegistry();
  const depsOf = buildTransitiveDeps(features);
  const segToKey = segmentToFeatureKey(features);
  const errors = [];

  const srcFeatures = path.join(REPO_ROOT, 'src/features');
  const files = walkTsFiles(srcFeatures);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relPosix = path.relative(REPO_ROOT, file).split(path.sep).join('/');
    const ownerKey = featureKeyForSourceFile(features, relPosix);
    let m;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(content)) !== null) {
      const segment = m[1];
      const importKey = segToKey.get(segment);
      if (!ownerKey || !importKey || ownerKey === importKey) continue;
      const allowed = depsOf(ownerKey);
      if (!allowed.has(importKey)) {
        errors.push(
          `${path.relative(REPO_ROOT, file)}: import @/features/${segment} — owner feature '${ownerKey}' lacks dependsOn (transitive) to '${importKey}'`,
        );
      }
    }
  }

  const allowlist = loadAllowlist();
  for (const zone of [path.join(REPO_ROOT, 'src/core'), path.join(REPO_ROOT, 'src/pages')]) {
    for (const file of walkTsFiles(zone)) {
      if (ENTRYPOINTS.has(file)) continue;
      if (allowlist.has(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      IMPORT_RE.lastIndex = 0;
      if (IMPORT_RE.test(content)) {
        errors.push(
          `${path.relative(REPO_ROOT, file)}: imports from @/features/* — add to packaging/audit-core-pages-allowlist.json or move to a registry entrypoint`,
        );
      }
    }
  }

  const invalidSku = process.argv.includes('--check-sku-example');
  if (invalidSku) {
    const expanded = expandDisabledKeys(features, ['coffeeChats']);
    if (!expanded.has('pdp')) {
      errors.push('internal: expandDisabledKeys should disable pdp when coffeeChats is disabled');
    }
  }

  if (errors.length) {
    console.error('packaging/audit-imports.mjs failed:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('packaging/audit-imports.mjs: OK');
}

main();
