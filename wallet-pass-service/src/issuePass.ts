import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseJwtVerifier } from './auth.js';
import { buildBrotherhoodTicketPass, type SigningMaterial } from './buildPass.js';

const REQUIRED_ENV = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'APPLE_PASS_TYPE_IDENTIFIER',
  'APPLE_TEAM_ID',
  'PASS_ORGANIZATION_NAME',
  'WALLET_WWDR_PEM',
  'WALLET_SIGNER_CERT_PEM',
  'WALLET_SIGNER_KEY_PEM',
] as const;

type TicketRow = {
  id: string;
  user_id: string;
  check_in_code: string;
  payment_status: string;
  cancelled_at: string | null;
  ticketed_events: {
    title: string;
    starts_at: string;
    ends_at: string | null;
    location: string | null;
    price_cents: number;
  } | null;
};

export type IssuedPass =
  | { status: number; json: { error: string } }
  | { status: 200; pkpass: Buffer };

function envValue(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function supabaseUrl(): string {
  return envValue('SUPABASE_URL') || envValue('VITE_SUPABASE_URL');
}

export function walletEnvStatus(): { ok: boolean; missing: string[] } {
  const missing = REQUIRED_ENV.filter((name) => !envValue(name));
  if (!supabaseUrl()) missing.unshift('SUPABASE_URL');
  return { ok: missing.length === 0, missing };
}

function requireConfigured(name: string): string {
  const value = envValue(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function loadPem(name: string): Buffer {
  return Buffer.from(requireConfigured(name).replace(/\\n/g, '\n'), 'utf8');
}

function loadSigningMaterial(): SigningMaterial {
  return {
    wwdr: loadPem('WALLET_WWDR_PEM'),
    signerCert: loadPem('WALLET_SIGNER_CERT_PEM'),
    signerKey: loadPem('WALLET_SIGNER_KEY_PEM'),
    ...(envValue('WALLET_SIGNER_KEY_PASSPHRASE')
      ? { signerKeyPassphrase: envValue('WALLET_SIGNER_KEY_PASSPHRASE') }
      : {}),
  };
}

function admissionReady(ev: TicketRow['ticketed_events'], paymentStatus: string): boolean {
  if (!ev) return false;
  if (ev.price_cents <= 0) return true;
  return paymentStatus === 'paid' || paymentStatus === 'waived';
}

let admin: SupabaseClient | null = null;
let verifyJwt: ((token: string) => Promise<{ sub: string }>) | null = null;

function clients(): { admin: SupabaseClient; verifyJwt: (token: string) => Promise<{ sub: string }> } {
  const url = supabaseUrl();
  const key = requireConfigured('SUPABASE_SERVICE_ROLE_KEY');
  if (!url) throw new Error('Missing required environment variable: SUPABASE_URL');
  if (!admin) admin = createClient(url, key);
  if (!verifyJwt) verifyJwt = createSupabaseJwtVerifier(url);
  return { admin, verifyJwt };
}

export async function issueTicketPass(
  ticketId: string,
  authorizationHeader: string | undefined
): Promise<IssuedPass> {
  if (!walletEnvStatus().ok) {
    return { status: 503, json: { error: 'pass_signing_unconfigured' } };
  }

  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7).trim() : '';
  if (!token) return { status: 401, json: { error: 'missing_bearer_token' } };

  let userId: string;
  try {
    ({ sub: userId } = await clients().verifyJwt(token));
  } catch {
    return { status: 401, json: { error: 'invalid_token' } };
  }

  if (!ticketId || !/^[0-9a-f-]{36}$/i.test(ticketId)) {
    return { status: 400, json: { error: 'invalid_ticket_id' } };
  }

  const { data: row, error } = await clients().admin
    .from('event_tickets')
    .select(
      `
      id,
      user_id,
      check_in_code,
      payment_status,
      cancelled_at,
      ticketed_events (
        title,
        starts_at,
        ends_at,
        location,
        price_cents
      )
    `
    )
    .eq('id', ticketId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return { status: 500, json: { error: 'db_error' } };
  }

  const ticket = row as TicketRow | null;
  const eventRecord = ticket?.ticketed_events;
  const ev = Array.isArray(eventRecord) ? eventRecord[0] : eventRecord;
  if (!ticket || ticket.cancelled_at || ticket.user_id !== userId || !ev) {
    return { status: 404, json: { error: 'ticket_not_found' } };
  }

  if (!admissionReady(ev, ticket.payment_status)) {
    return { status: 403, json: { error: 'payment_required' } };
  }

  let attendeeName: string | null = null;
  const { data: profile } = await clients().admin
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile) {
    attendeeName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || null;
  }

  let certs: SigningMaterial;
  try {
    certs = loadSigningMaterial();
  } catch (e) {
    console.error('Wallet signing material not configured:', e);
    return { status: 503, json: { error: 'pass_signing_unconfigured' } };
  }

  try {
    const pkpass = buildBrotherhoodTicketPass(
      {
        ticketId: ticket.id,
        checkInCode: ticket.check_in_code,
        eventTitle: ev.title,
        startsAt: ev.starts_at,
        endsAt: ev.ends_at,
        location: ev.location,
        attendeeName,
      },
      certs,
      {
        passTypeIdentifier: requireConfigured('APPLE_PASS_TYPE_IDENTIFIER'),
        teamIdentifier: requireConfigured('APPLE_TEAM_ID'),
        organizationName: requireConfigured('PASS_ORGANIZATION_NAME'),
      }
    );
    return { status: 200, pkpass };
  } catch (e) {
    console.error('Pass build failed:', e);
    return { status: 500, json: { error: 'pass_build_failed' } };
  }
}
