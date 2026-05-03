import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseJwtVerifier } from './auth.js';
import { buildBrotherhoodTicketPass, type SigningMaterial } from './buildPass.js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

function loadPem(name: string): Buffer {
  const raw = requireEnv(name);
  return Buffer.from(raw.replace(/\\n/g, '\n'), 'utf8');
}

function loadSigningMaterial(): SigningMaterial {
  return {
    wwdr: loadPem('WALLET_WWDR_PEM'),
    signerCert: loadPem('WALLET_SIGNER_CERT_PEM'),
    signerKey: loadPem('WALLET_SIGNER_KEY_PEM'),
    ...(process.env.WALLET_SIGNER_KEY_PASSPHRASE
      ? { signerKeyPassphrase: process.env.WALLET_SIGNER_KEY_PASSPHRASE }
      : {}),
  };
}

const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const PASS_TYPE_IDENTIFIER = requireEnv('APPLE_PASS_TYPE_IDENTIFIER');
const TEAM_IDENTIFIER = requireEnv('APPLE_TEAM_ID');
const ORGANIZATION_NAME = requireEnv('PASS_ORGANIZATION_NAME');

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const verifyJwt = createSupabaseJwtVerifier(SUPABASE_URL);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, cb) {
      if (ALLOWED_ORIGINS.length === 0) {
        cb(null, true);
        return;
      }
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
  })
);

const limiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/wallet', limiter);

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

function admissionReady(ev: TicketRow['ticketed_events'], paymentStatus: string): boolean {
  if (!ev) return false;
  if (ev.price_cents <= 0) return true;
  return paymentStatus === 'paid' || paymentStatus === 'waived';
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/wallet/tickets/:ticketId/pass', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'missing_bearer_token' });
    return;
  }

  let userId: string;
  try {
    ({ sub: userId } = await verifyJwt(token));
  } catch {
    res.status(401).json({ error: 'invalid_token' });
    return;
  }

  const ticketId = req.params.ticketId;
  if (!ticketId || !/^[0-9a-f-]{36}$/i.test(ticketId)) {
    res.status(400).json({ error: 'invalid_ticket_id' });
    return;
  }

  const { data: row, error } = await supabaseAdmin
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
    res.status(500).json({ error: 'db_error' });
    return;
  }

  const ticket = row as TicketRow | null;
  if (!ticket || ticket.cancelled_at || ticket.user_id !== userId) {
    res.status(404).json({ error: 'ticket_not_found' });
    return;
  }

  const ev = ticket.ticketed_events;
  if (!ev) {
    res.status(404).json({ error: 'event_not_found' });
    return;
  }

  if (!admissionReady(ev, ticket.payment_status)) {
    res.status(403).json({ error: 'payment_required' });
    return;
  }

  let attendeeName: string | null = null;
  const { data: profile } = await supabaseAdmin
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
    res.status(503).json({ error: 'pass_signing_unconfigured' });
    return;
  }

  try {
    const buffer = buildBrotherhoodTicketPass(
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
        passTypeIdentifier: PASS_TYPE_IDENTIFIER,
        teamIdentifier: TEAM_IDENTIFIER,
        organizationName: ORGANIZATION_NAME,
      }
    );

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename="BrotherhoodTicket.pkpass"');
    res.send(buffer);
  } catch (e) {
    console.error('Pass build failed:', e);
    res.status(500).json({ error: 'pass_build_failed' });
  }
});

const port = Number(process.env.PORT) || 3333;
app.listen(port, () => {
  console.log(`wallet-pass-service listening on ${port}`);
});
