/**
 * Build a stripped copy of the repo for a licensee SKU.
 * Usage: node packaging/build-sku.mjs packaging/skus/example.yaml
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import {
  parseFeatureRegistry,
  expandDisabledKeys,
} from './parse-feature-registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DIST = path.join(REPO_ROOT, 'dist-sku');

function parseSku(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  const out = { sku: '', disabledFeatures: [], brand: {} };
  const skuM = trimmed.match(/^\s*sku:\s*(.+?)\s*$/m);
  if (skuM) out.sku = skuM[1].replace(/^["']|["']$/g, '').trim();

  const inlineDf = trimmed.match(/^\s*disabledFeatures:\s*\[([^\]]*)\]\s*$/m);
  if (inlineDf) {
    out.disabledFeatures = inlineDf[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  } else {
    const lines = trimmed.split(/\r?\n/);
    let inList = false;
    for (const line of lines) {
      if (/^\s*disabledFeatures:\s*$/.test(line)) {
        inList = true;
        continue;
      }
      if (inList) {
        const m = line.match(/^\s*-\s*(\w+)\s*$/);
        if (m) out.disabledFeatures.push(m[1]);
        else if (line.trim() && !line.match(/^\s+/)) inList = false;
      }
    }
  }

  let inBrand = false;
  for (const line of trimmed.split(/\r?\n/)) {
    if (/^brand:\s*$/.test(line)) {
      inBrand = true;
      continue;
    }
    if (inBrand) {
      const m = line.match(/^\s+(\w+):\s*(.+?)\s*$/);
      if (m) {
        out.brand[m[1]] = m[2].replace(/^["']|["']$/g, '');
      } else if (line.trim() && !line.match(/^\s/) && !line.startsWith('#')) {
        inBrand = false;
      }
    }
  }

  if (!out.sku) throw new Error('SKU file must set sku:');
  return out;
}

function stripRegisterBlocks(content, disabled) {
  const prefix = 'registerFeature({';
  let out = '';
  let i = 0;
  while (true) {
    const start = content.indexOf(prefix, i);
    if (start === -1) {
      out += content.slice(i);
      break;
    }
    out += content.slice(i, start);
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
    const semi = content.indexOf(';', pos);
    const blockEnd = semi === -1 ? pos : semi + 1;
    const fullBlock = content.slice(start, blockEnd);
    if (keyM && !disabled.has(keyM[1])) {
      out += fullBlock;
    }
    i = blockEnd;
  }
  return out;
}

function patchOrgFeatures(content, disabled, brand) {
  let next = content;
  for (const key of disabled) {
    next = next.replace(new RegExp(`(\\b${key}\\b):\\s*true`, 'g'), `$1: false`);
  }
  if (brand.shortName) {
    next = next.replace(/shortName:\s*"[^"]*"/, `shortName: "${brand.shortName}"`);
  }
  if (brand.domain) {
    next = next.replace(/domain:\s*"[^"]*"/, `domain: "${brand.domain}"`);
  }
  if (brand.name) {
    next = next.replace(/name:\s*"[^"]*"/, `name: "${brand.name}"`);
  }
  if (brand.chapterName) {
    next = next.replace(/chapterName:\s*"[^"]*"/, `chapterName: "${brand.chapterName}"`);
  }
  return next;
}

function copyFiltered(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const skip = new Set(['node_modules', 'dist', 'dist-sku', '.git', '.cursor']);
  function walk(rel) {
    const abs = path.join(src, rel);
    const st = fs.statSync(abs, { throwIfNoEntry: false });
    if (!st) return;
    const base = path.basename(abs);
    if (rel === '') {
      for (const name of fs.readdirSync(abs)) {
        if (skip.has(name)) continue;
        walk(name);
      }
      return;
    }
    const destAbs = path.join(dest, rel);
    if (st.isDirectory()) {
      fs.mkdirSync(destAbs, { recursive: true });
      for (const name of fs.readdirSync(abs)) {
        if (skip.has(name)) continue;
        walk(path.join(rel, name));
      }
    } else {
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      fs.copyFileSync(abs, destAbs);
    }
  }
  walk('');
}

function main() {
  const skuFileArg = process.argv[2];
  if (!skuFileArg) {
    console.error('Usage: node packaging/build-sku.mjs <path-to-sku.yaml>');
    process.exit(1);
  }
  const skuPath = path.isAbsolute(skuFileArg) ? skuFileArg : path.join(REPO_ROOT, skuFileArg);
  const sku = parseSku(fs.readFileSync(skuPath, 'utf8'));
  const features = parseFeatureRegistry();
  const disabled = expandDisabledKeys(features, sku.disabledFeatures);
  const skuDir = path.join(DIST, sku.sku);

  if (fs.existsSync(skuDir)) fs.rmSync(skuDir, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  console.log(`Copying repo → ${path.relative(REPO_ROOT, skuDir)} …`);
  copyFiltered(REPO_ROOT, skuDir);

  for (const key of disabled) {
    const f = features.find((x) => x.key === key);
    if (!f) continue;
    for (const p of f.paths) {
      const target = path.join(skuDir, p);
      if (fs.existsSync(target)) {
        console.log(`Removing ${p}`);
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
  }

  const regPath = path.join(skuDir, 'src/config/featureRegistrations.ts');
  const reg = fs.readFileSync(regPath, 'utf8');
  fs.writeFileSync(regPath, stripRegisterBlocks(reg, disabled), 'utf8');

  const orgPath = path.join(skuDir, 'src/config/org.ts');
  const orgContent = fs.readFileSync(orgPath, 'utf8');
  fs.writeFileSync(orgPath, patchOrgFeatures(orgContent, disabled, sku.brand ?? {}), 'utf8');

  console.log('Running packaging audit in SKU copy …');
  execSync('node packaging/audit-imports.mjs', { cwd: skuDir, stdio: 'inherit' });

  console.log('npm ci …');
  execSync('npm ci', { cwd: skuDir, stdio: 'inherit' });

  console.log('npm run typecheck …');
  execSync('npm run typecheck', { cwd: skuDir, stdio: 'inherit' });

  console.log('npm run build …');
  execSync('npm run build', { cwd: skuDir, stdio: 'inherit' });

  const tgz = path.join(DIST, `${sku.sku}.tgz`);
  if (fs.existsSync(tgz)) fs.rmSync(tgz);
  execSync(`tar -czf "${tgz}" -C "${skuDir}" .`, { stdio: 'inherit' });
  console.log(`Wrote ${path.relative(REPO_ROOT, tgz)}`);
}

main();
