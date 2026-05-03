/**
 * Clover Hosted Checkout webhook receiver.
 *
 * External setup (merchant / chapter):
 * 1. Clover Merchant Dashboard → Settings → Ecommerce → Hosted Checkout.
 * 2. Set Webhook URL to: https://<project-ref>.supabase.co/functions/v1/clover-webhook
 * 3. Generate Signing Secret; copy into Supabase secret CLOVER_WEBHOOK_SIGNING_SECRET.
 * 4. Use the same sandbox vs production merchant as your CLOVER_* secrets in create-checkout.
 *
 * Supabase secrets for this function:
 * - CLOVER_WEBHOOK_SIGNING_SECRET (from Hosted Checkout webhook settings)
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { verifyCloverHostedCheckoutSignature } from '../_shared/cloverSignature.ts';

function mustGetEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function extractHostedFields(o: Record<string, unknown>): {
  checkoutSessionId: string | null;
  paymentId: string | null;
  status: string | null;
  type: string | null;
} {
  const status = pickString(o, ['status', 'paymentStatus', 'payment_status']);
  const typ = pickString(o, ['type']);
  let paymentId = pickString(o, ['paymentId', 'payment_id']);
  if (!paymentId && typ === 'PAYMENT') {
    paymentId = pickString(o, ['id']);
  }
  if (!paymentId) {
    paymentId = pickString(o, ['id']);
  }

  let checkoutSessionId = pickString(o, ['checkoutSessionId', 'checkoutId', 'checkout_id']);
  const data = o['data'];
  if (!checkoutSessionId && typeof data === 'string') checkoutSessionId = data;
  if (!checkoutSessionId && data && typeof data === 'object') {
    checkoutSessionId = pickString(data as Record<string, unknown>, [
      'checkoutSessionId',
      'checkoutId',
      'checkout_id',
    ]);
  }

  return { checkoutSessionId, paymentId, status, type: typ };
}

function walkHostedObjects(body: unknown, visitor: (o: Record<string, unknown>) => void) {
  if (!body || typeof body !== 'object') return;
  const root = body as Record<string, unknown>;
  visitor(root);

  const merchants = root['merchants'];
  if (merchants && typeof merchants === 'object' && !Array.isArray(merchants)) {
    for (const bucket of Object.values(merchants as Record<string, unknown>)) {
      if (Array.isArray(bucket)) {
        for (const item of bucket) {
          if (item && typeof item === 'object') visitor(item as Record<string, unknown>);
        }
      } else if (bucket && typeof bucket === 'object') {
        visitor(bucket as Record<string, unknown>);
      }
    }
  }
}

function isApprovedStatus(status: string | null): boolean {
  if (!status) return false;
  const u = status.toUpperCase();
  return u === 'APPROVED' || u === 'PAID' || u === 'SUCCESS' || u.includes('APPROVED');
}

function isDeclinedStatus(status: string | null): boolean {
  if (!status) return false;
  const u = status.toUpperCase();
  return u === 'DECLINED' || u === 'FAILED' || u.includes('DECLIN') || u === 'VOIDED' || u === 'CANCELLED';
}

function treatAsApproved(fields: ReturnType<typeof extractHostedFields>): boolean {
  if (isDeclinedStatus(fields.status)) return false;
  if (isApprovedStatus(fields.status)) return true;
  return fields.type === 'PAYMENT' && !!fields.paymentId && !!fields.checkoutSessionId;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const rawBody = await req.text();
    const signingSecret = Deno.env.get('CLOVER_WEBHOOK_SIGNING_SECRET') ?? '';
    const sigHeader = req.headers.get('Clover-Signature') ?? req.headers.get('clover-signature');

    if (signingSecret) {
      const ok = await verifyCloverHostedCheckoutSignature(rawBody, sigHeader, signingSecret);
      if (!ok) {
        console.warn('[clover-webhook] invalid signature');
        return new Response(JSON.stringify({ ok: false, error: 'invalid_signature' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }
    } else {
      console.warn('[clover-webhook] CLOVER_WEBHOOK_SIGNING_SECRET unset; skipping signature verification');
    }

    let body: unknown;
    try {
      body = rawBody.length ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const supabase = createClient(mustGetEnv('SUPABASE_URL'), mustGetEnv('SUPABASE_SERVICE_ROLE_KEY'));

    const failSessions = new Set<string>();
    const applyRows: { checkoutSessionId: string; paymentId: string }[] = [];

    walkHostedObjects(body, (o) => {
      const fields = extractHostedFields(o);
      const { checkoutSessionId, paymentId } = fields;
      if (!checkoutSessionId) return;

      if (isDeclinedStatus(fields.status)) {
        failSessions.add(checkoutSessionId);
        return;
      }

      if (!paymentId) return;
      if (!treatAsApproved(fields)) return;

      applyRows.push({ checkoutSessionId, paymentId });
    });

    const seenPayment = new Set<string>();
    const dedupedApply = applyRows.filter((r) => {
      if (seenPayment.has(r.paymentId)) return false;
      seenPayment.add(r.paymentId);
      return true;
    });

    const successSessions = new Set(dedupedApply.map((r) => r.checkoutSessionId));

    const results: Record<string, unknown>[] = [];

    for (const sid of failSessions) {
      if (successSessions.has(sid)) continue;
      const { data, error } = await supabase.rpc('mark_clover_checkout_failed', {
        p_checkout_session_id: sid,
      });
      results.push({ checkoutSessionId: sid, action: 'mark_failed', data, error: error?.message });
    }

    for (const { checkoutSessionId, paymentId } of dedupedApply) {
      const { data, error } = await supabase.rpc('apply_clover_checkout_success', {
        p_checkout_session_id: checkoutSessionId,
        p_clover_payment_id: paymentId,
      });
      results.push({
        checkoutSessionId,
        paymentId,
        action: 'apply_success',
        data,
        error: error?.message,
      });
    }

    if (results.length === 0) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[clover-webhook]', msg);
    return new Response(JSON.stringify({ ok: false, error: 'internal_error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
