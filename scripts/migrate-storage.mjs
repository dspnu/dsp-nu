#!/usr/bin/env node
/**
 * Copy Supabase Storage objects from Lovable Cloud → your own Supabase project.
 * Preserves bucket_id + object path (required for DB references).
 *
 * Usage:
 *   cp .env.migration.example .env.migration   # fill in keys
 *   node scripts/migrate-storage.mjs
 *
 * Optional flags:
 *   --dry-run          List objects only, no download/upload
 *   --from-backup      Parse object list from BACKUP_PATH (default if set)
 *   --public-only      Migrate only public buckets (no SOURCE_SERVICE_ROLE_KEY needed)
 */

import { createClient } from '@supabase/supabase-js';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(resolve(ROOT, '.env.migration'));
loadEnvFile(resolve(ROOT, '.env'));

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipExisting = args.has('--skip-existing');
const publicOnly = args.has('--public-only');
const useBackup = args.has('--from-backup') || Boolean(process.env.BACKUP_PATH);

const SOURCE_URL = (process.env.SOURCE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY || '';
const TARGET_URL = (process.env.TARGET_SUPABASE_URL || '').replace(/\/$/, '');
const TARGET_KEY = process.env.TARGET_SERVICE_ROLE_KEY || '';
const BACKUP_PATH = process.env.BACKUP_PATH || '';
const PG_RESTORE = process.env.PG_RESTORE_PATH || '/opt/homebrew/opt/postgresql@17/bin/pg_restore';

/** Buckets created by Lovable export tooling — not app data. */
const SKIP_BUCKETS = new Set(['database_export_12_08_26']);

function die(msg) {
  console.error(`\n[migrate-storage] ERROR: ${msg}`);
  process.exit(1);
}

function normalizeSupabaseUrl(url) {
  if (!url) return url;
  // Users sometimes paste .supabase.com; API host is .supabase.co
  return url.replace(/\.supabase\.com\b/i, '.supabase.co');
}

function parseBucketsFromBackupSql(sql) {
  const buckets = new Map();
  const copyStart = sql.indexOf('COPY storage.buckets');
  if (copyStart === -1) return buckets;
  const dataStart = sql.indexOf('\n', sql.indexOf('FROM stdin;', copyStart)) + 1;
  const dataEnd = sql.indexOf('\n\\.\n', dataStart);
  const block = sql.slice(dataStart, dataEnd === -1 ? undefined : dataEnd);
  for (const line of block.split('\n')) {
    if (!line.trim()) continue;
    const [id, , , , , isPublic] = line.split('\t');
    if (!id) continue;
    buckets.set(id, { public: isPublic === 't' });
  }
  return buckets;
}

function parseObjectsFromBackupSql(sql) {
  const objects = [];
  const copyStart = sql.indexOf('COPY storage.objects');
  if (copyStart === -1) return objects;
  const dataStart = sql.indexOf('\n', sql.indexOf('FROM stdin;', copyStart)) + 1;
  const dataEnd = sql.indexOf('\n\\.\n', dataStart);
  const block = sql.slice(dataStart, dataEnd === -1 ? undefined : dataEnd);
  for (const line of block.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const bucket_id = parts[1];
    const name = parts[2];
    let mimetype = 'application/octet-stream';
    try {
      const meta = JSON.parse(parts[7] || '{}');
      if (meta.mimetype) mimetype = meta.mimetype;
    } catch {
      /* ignore bad metadata */
    }
    objects.push({ bucket_id, name, mimetype });
  }
  return objects;
}

function extractBackupSection(backupFile, table) {
  const outFile = `/tmp/migrate-storage-${table}.sql`;
  const result = spawnSync(
    PG_RESTORE,
    ['-f', outFile, '--data-only', '--table', table, '--schema', 'storage', backupFile],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    die(
      `pg_restore failed for storage.${table}: ${result.stderr || result.stdout}\n` +
        `Set PG_RESTORE_PATH if pg_restore is not at ${PG_RESTORE}`,
    );
  }
  return readFileSync(outFile, 'utf8');
}

function loadInventoryFromBackup(backupFile) {
  console.log(`[migrate-storage] Reading object list from backup: ${backupFile}`);
  const bucketsSql = extractBackupSection(backupFile, 'buckets');
  const objectsSql = extractBackupSection(backupFile, 'objects');
  const bucketMeta = parseBucketsFromBackupSql(bucketsSql);
  const objects = parseObjectsFromBackupSql(objectsSql).filter((o) => !SKIP_BUCKETS.has(o.bucket_id));
  return { bucketMeta, objects };
}

async function listAllFromApi(sourceAdmin, bucketId, prefix = '') {
  const objects = [];
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const { data, error } = await sourceAdmin.storage.from(bucketId).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`list ${bucketId}/${prefix}: ${error.message}`);
    if (!data?.length) break;
    for (const entry of data) {
      const fullName = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        objects.push(...(await listAllFromApi(sourceAdmin, bucketId, fullName)));
      } else {
        objects.push({
          bucket_id: bucketId,
          name: fullName,
          mimetype: entry.metadata?.mimetype,
        });
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return objects;
}

async function downloadObject({ sourceAdmin, sourceUrl, bucketMeta, bucket_id, name }) {
  const isPublic = bucketMeta.get(bucket_id)?.public === true;
  if (isPublic) {
    const url = `${sourceUrl}/storage/v1/object/public/${encodeURIComponent(bucket_id)}/${name.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`public download ${bucket_id}/${name}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { data: buf, contentType: res.headers.get('content-type') || 'application/octet-stream' };
  }
  if (!sourceAdmin) {
    throw new Error(`private bucket "${bucket_id}" requires SOURCE_SERVICE_ROLE_KEY`);
  }
  const { data, error } = await sourceAdmin.storage.from(bucket_id).download(name);
  if (error) throw new Error(`admin download ${bucket_id}/${name}: ${error.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  return { data: buf, contentType: data.type || 'application/octet-stream' };
}

async function targetHasObject(targetAdmin, bucket_id, name) {
  const folder = name.includes('/') ? name.slice(0, name.lastIndexOf('/')) : '';
  const base = name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name;
  const { data, error } = await targetAdmin.storage.from(bucket_id).list(folder, { search: base });
  if (error) return false;
  return (data || []).some((e) => e.name === base);
}

async function ensureBucket(targetAdmin, bucket_id, isPublic) {
  const { data: existing } = await targetAdmin.storage.getBucket(bucket_id);
  if (existing) return;
  const { error } = await targetAdmin.storage.createBucket(bucket_id, { public: isPublic });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`create bucket ${bucket_id}: ${error.message}`);
  }
  console.log(`[migrate-storage] Created bucket "${bucket_id}" (public=${isPublic})`);
}

async function main() {
  const sourceUrl = normalizeSupabaseUrl(SOURCE_URL);
  const targetUrl = normalizeSupabaseUrl(TARGET_URL);

  if (!sourceUrl) die('Set SOURCE_SUPABASE_URL (old Lovable project).');
  if (!dryRun) {
    if (!targetUrl) die('Set TARGET_SUPABASE_URL (new project).');
    if (!TARGET_KEY) die('Set TARGET_SERVICE_ROLE_KEY (Dashboard → Project Settings → API → service_role).');
  }

  const sourceAdmin = SOURCE_KEY ? createClient(sourceUrl, SOURCE_KEY) : null;
  const targetAdmin = targetUrl && TARGET_KEY ? createClient(targetUrl, TARGET_KEY) : null;

  let bucketMeta = new Map();
  let objects = [];

  if (useBackup) {
    if (!BACKUP_PATH) die('Set BACKUP_PATH to your .backup file (or unzip the export first).');
    let backupFile = BACKUP_PATH;
    if (backupFile.endsWith('.zip')) {
      die('Unzip the backup first, or set BACKUP_PATH to the inner .backup file.');
    }
    if (!existsSync(backupFile)) die(`Backup not found: ${backupFile}`);
    ({ bucketMeta, objects } = loadInventoryFromBackup(backupFile));
  } else if (!sourceAdmin) {
    die('Without --from-backup, SOURCE_SERVICE_ROLE_KEY is required to list buckets.');
  } else {
    const { data: buckets, error } = await sourceAdmin.storage.listBuckets();
    if (error) die(`listBuckets: ${error.message}`);
    for (const b of buckets || []) {
      if (SKIP_BUCKETS.has(b.name)) continue;
      bucketMeta.set(b.name, { public: b.public === true });
      const listed = await listAllFromApi(sourceAdmin, b.name);
      objects.push(...listed.map((o) => ({ ...o, bucket_id: b.name })));
    }
  }

  const needsPrivateSource =
    !publicOnly && objects.some((o) => bucketMeta.get(o.bucket_id)?.public !== true);
  if (publicOnly) {
    objects = objects.filter((o) => bucketMeta.get(o.bucket_id)?.public === true);
    console.log(`[migrate-storage] --public-only: ${objects.length} public object(s)`);
  }
  if (!dryRun && needsPrivateSource && !SOURCE_KEY) {
    die(
      'This migration includes private buckets (pdp-submissions, service-hours-photos, etc.).\n' +
        'Add SOURCE_SERVICE_ROLE_KEY to .env.migration.\n' +
        'In Lovable: deploy a one-off edge function that returns Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),\n' +
        'or check if Cloud settings expose it. Delete the function after migration.',
    );
  }

  console.log(`[migrate-storage] ${objects.length} object(s) to migrate`);
  if (dryRun) {
    for (const o of objects) {
      const pub = bucketMeta.get(o.bucket_id)?.public ? 'public' : 'private';
      console.log(`  - [${pub}] ${o.bucket_id}/${o.name}`);
    }
    return;
  }

  const stats = { copied: 0, skipped: 0, failed: 0, missing: 0 };

  for (const obj of objects) {
    const label = `${obj.bucket_id}/${obj.name}`;
    const isPublic = bucketMeta.get(obj.bucket_id)?.public === true;

    try {
      if (skipExisting && (await targetHasObject(targetAdmin, obj.bucket_id, obj.name))) {
        console.log(`[skip existing] ${label}`);
        stats.skipped++;
        continue;
      }

      await ensureBucket(targetAdmin, obj.bucket_id, isPublic);

      const { data, contentType } = await downloadObject({
        sourceAdmin,
        sourceUrl,
        bucketMeta,
        bucket_id: obj.bucket_id,
        name: obj.name,
      });

      const { error: uploadError } = await targetAdmin.storage
        .from(obj.bucket_id)
        .upload(obj.name, data, {
          upsert: true,
          contentType: obj.mimetype || contentType,
        });

      if (uploadError) throw new Error(uploadError.message);
      console.log(`[copied] ${label} (${data.length} bytes)`);
      stats.copied++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/not found|404|Object not found/i.test(msg)) {
        console.warn(`[missing on source] ${label}`);
        stats.missing++;
      } else {
        console.error(`[failed] ${label}: ${msg}`);
        stats.failed++;
      }
    }
  }

  console.log('\n[migrate-storage] Done:', stats);
  if (stats.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
