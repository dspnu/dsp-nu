#!/usr/bin/env node
/**
 * Generate the Apple Sign In client-secret JWT that Supabase's Apple provider
 * expects in "Secret Key". This is NOT the .p8 file itself.
 *
 * Usage:
 *   node scripts/generate-apple-client-secret.mjs \
 *     --team-id ABCD123456 \
 *     --key-id XYZ9876543 \
 *     --services-id com.tartabinienterprises.dspnu.web \
 *     --p8 ~/Downloads/AuthKey_XYZ9876543.p8
 *
 * Then paste the printed JWT into Supabase → Authentication → Providers → Apple → Secret Key.
 */
import { createPrivateKey, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return fallback;
  return process.argv[i + 1];
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

const teamId = arg('--team-id');
const keyId = arg('--key-id');
const servicesId = arg('--services-id');
const p8Path = arg('--p8');

if (!teamId || !keyId || !servicesId || !p8Path) {
  die(`Missing args.

Usage:
  node scripts/generate-apple-client-secret.mjs \\
    --team-id <10-char Team ID> \\
    --key-id <10-char Key ID from Keys list> \\
    --services-id <Services ID, e.g. com.tartabinienterprises.dspnu.web> \\
    --p8 /path/to/AuthKey_XXXXXXXXXX.p8
`);
}

let pem;
try {
  pem = readFileSync(resolve(p8Path), 'utf8');
} catch {
  die(`Could not read .p8 file: ${p8Path}`);
}

if (!pem.includes('BEGIN PRIVATE KEY')) {
  die('That file does not look like an Apple AuthKey .p8 (missing BEGIN PRIVATE KEY).');
}

const now = Math.floor(Date.now() / 1000);
// Apple max lifetime is 6 months (15777000 seconds). Use just under that.
const exp = now + 15777000;

const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
const payload = Buffer.from(
  JSON.stringify({
    iss: teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: servicesId,
  }),
).toString('base64url');

const signingInput = `${header}.${payload}`;
const key = createPrivateKey(pem);
const signature = createSign('SHA256')
  .update(signingInput)
  .sign({ key, dsaEncoding: 'ieee-p1363' });

const jwt = `${signingInput}.${signature.toString('base64url')}`;
const expiresAt = new Date(exp * 1000).toISOString().slice(0, 10);

console.log('\nPaste this into Supabase → Authentication → Providers → Apple → Secret Key:\n');
console.log(jwt);
console.log(`\nExpires: ${expiresAt} (rotate before then; Apple caps this at 6 months)\n`);
