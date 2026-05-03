/**
 * Creates a Clover Hosted Checkout session and stores a pending row in public.clover_checkouts.
 *
 * Supabase secrets:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (used for auth.getUser(jwt) + DB writes)
 * - CLOVER_MERCHANT_ID
 * - CLOVER_PRIVATE_TOKEN (Ecommerce private / bearer token for Hosted Checkout API)
 * - CLOVER_API_BASE (optional; default https://apisandbox.dev.clover.com in dev — set https://api.clover.com for US prod)
 * - CLOVER_PAGE_CONFIG_UUID (optional; Hosted Checkout custom page id from merchant dashboard)
 *
 * External: enable Hosted Checkout + Ecommerce on the Clover merchant; install app / generate Ecommerce API token per Clover docs.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function mustGetEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

type Purpose = 'dues' | 'ticket' | 'generic';

interface CreateBody {
  purpose: Purpose;
  amountCents: number;
  semester?: string;
  targetUserId?: string;
  eventTicketId?: string;
}

const MAX_AMOUNT_CENTS = 1_000_000; // $10,000.00

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json(405, { error: 'method_not_allowed' });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'missing_authorization' });
    }

    const jwt = authHeader.slice('Bearer '.length).trim();
    const supabase = createClient(mustGetEnv('SUPABASE_URL'), mustGetEnv('SUPABASE_SERVICE_ROLE_KEY'));

    const { data: userData, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !userData.user) {
      return json(401, { error: 'invalid_session' });
    }
    const callerId = userData.user.id;

    const { data: isOfficer, error: roleErr } = await supabase.rpc('is_admin_or_officer', {
      _user_id: callerId,
    });
    if (roleErr) {
      console.error('[clover-create-checkout] role rpc', roleErr);
      return json(500, { error: 'role_check_failed' });
    }
    const officer = !!isOfficer;

    let body: CreateBody;
    try {
      body = (await req.json()) as CreateBody;
    } catch {
      return json(400, { error: 'invalid_json' });
    }

    const purpose = body.purpose;
    if (purpose !== 'dues' && purpose !== 'ticket' && purpose !== 'generic') {
      return json(400, { error: 'invalid_purpose' });
    }

    const amountCents = Math.floor(Number(body.amountCents));
    if (!Number.isFinite(amountCents) || amountCents <= 0 || amountCents > MAX_AMOUNT_CENTS) {
      return json(400, { error: 'invalid_amount_cents' });
    }

    if (purpose === 'generic' && !officer) {
      return json(403, { error: 'generic_requires_officer' });
    }

    const targetUserId = (body.targetUserId?.trim() || callerId) as string;
    if (targetUserId !== callerId && !officer) {
      return json(403, { error: 'cannot_create_for_other_member' });
    }

    const semester = body.semester?.trim() || null;
    if ((purpose === 'dues' || purpose === 'generic') && !semester) {
      return json(400, { error: 'semester_required' });
    }

    let eventTicketId: string | null = null;
    let ticketedEventId: string | null = null;

    if (purpose === 'ticket') {
      const tid = body.eventTicketId?.trim();
      if (!tid) return json(400, { error: 'event_ticket_id_required' });

      const { data: ticket, error: tErr } = await supabase
        .from('event_tickets')
        .select(
          `
          id,
          user_id,
          payment_status,
          ticketed_event_id,
          ticketed_events ( price_cents )
        `,
        )
        .eq('id', tid)
        .maybeSingle();

      if (tErr || !ticket) {
        return json(404, { error: 'ticket_not_found' });
      }
      if (ticket.user_id !== targetUserId) {
        return json(400, { error: 'ticket_user_mismatch' });
      }
      if (ticket.user_id !== callerId && !officer) {
        return json(403, { error: 'forbidden' });
      }
      if (ticket.payment_status !== 'pending') {
        return json(400, { error: 'ticket_not_pending' });
      }

      const te = (ticket as { ticketed_events?: { price_cents: number } | null }).ticketed_events;
      const evPrice = te?.price_cents;

      if (typeof evPrice !== 'number' || evPrice <= 0) {
        return json(400, { error: 'event_not_paid_ticket' });
      }
      if (amountCents !== evPrice) {
        return json(400, { error: 'amount_must_match_ticket_price', expectedCents: evPrice });
      }

      eventTicketId = ticket.id;
      ticketedEventId = ticket.ticketed_event_id;
    }

    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (pErr || !profile?.email) {
      return json(400, { error: 'profile_email_required_for_checkout' });
    }

    const merchantId = Deno.env.get('CLOVER_MERCHANT_ID') ?? '';
    const privateToken = Deno.env.get('CLOVER_PRIVATE_TOKEN') ?? '';
    const apiBase = (Deno.env.get('CLOVER_API_BASE') ?? 'https://apisandbox.dev.clover.com').replace(/\/$/, '');
    const pageConfigUuid = Deno.env.get('CLOVER_PAGE_CONFIG_UUID')?.trim();

    if (!merchantId || !privateToken) {
      return json(503, { error: 'clover_not_configured' });
    }

    const idempotencyKey = crypto.randomUUID();

    const lineName =
      purpose === 'ticket' ? 'Event ticket' : purpose === 'dues' ? 'Chapter dues' : 'Chapter payment';

    const checkoutPayload: Record<string, unknown> = {
      customer: {
        email: profile.email,
        firstName: (profile.first_name || 'Member').slice(0, 80),
        lastName: (profile.last_name || '').slice(0, 80),
      },
      shoppingCart: {
        lineItems: [
          {
            name: lineName,
            note: `dsp_idem:${idempotencyKey}`,
            price: amountCents,
            unitQty: 1,
          },
        ],
      },
    };
    if (pageConfigUuid) checkoutPayload.pageConfigUuid = pageConfigUuid;

    const cloverRes = await fetch(`${apiBase}/invoicingcheckoutservice/v1/checkouts`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${privateToken}`,
        'X-Clover-Merchant-Id': merchantId,
      },
      body: JSON.stringify(checkoutPayload),
    });

    const cloverText = await cloverRes.text();
    let cloverJson: Record<string, unknown> = {};
    try {
      cloverJson = cloverText ? (JSON.parse(cloverText) as Record<string, unknown>) : {};
    } catch {
      return json(502, { error: 'clover_invalid_json', status: cloverRes.status, body: cloverText.slice(0, 500) });
    }

    if (!cloverRes.ok) {
      console.error('[clover-create-checkout] Clover error', cloverRes.status, cloverText);
      return json(502, {
        error: 'clover_api_error',
        status: cloverRes.status,
        message: typeof cloverJson.message === 'string' ? cloverJson.message : cloverText.slice(0, 300),
      });
    }

    const href = typeof cloverJson.href === 'string' ? cloverJson.href : null;
    const checkoutSessionId =
      typeof cloverJson.checkoutSessionId === 'string' ? cloverJson.checkoutSessionId : null;

    if (!href || !checkoutSessionId) {
      return json(502, { error: 'clover_missing_href_or_session', cloverJson });
    }

    const { error: insertErr } = await supabase.from('clover_checkouts').insert({
      checkout_session_id: checkoutSessionId,
      link_url: href,
      amount_cents: amountCents,
      currency: 'USD',
      purpose,
      user_id: targetUserId,
      ticketed_event_id: ticketedEventId,
      event_ticket_id: eventTicketId,
      semester,
      metadata: { idempotencyKey, callerId },
      status: 'pending',
      idempotency_key: idempotencyKey,
      created_by: callerId,
    });

    if (insertErr) {
      console.error('[clover-create-checkout] insert', insertErr);
      return json(500, { error: 'db_insert_failed', details: insertErr.message });
    }

    return json(200, { url: href, checkoutSessionId, idempotencyKey });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[clover-create-checkout]', msg);
    return json(500, { error: 'internal_error' });
  }
});
