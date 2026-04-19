/// <reference lib="deno.unstable" />
/**
 * Database webhook target (POST JSON body from Supabase Database Webhooks).
 * - public.notifications INSERT → iOS push + optional member email (existing behavior).
 * - public.user_roles INSERT → email the member about a new portal role (add a webhook in the dashboard).
 * - public.profiles UPDATE → email when member_status changes (add a webhook; payload must include old_record).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6';
import { sendEmail } from '../_shared/sendEmail.ts';

type DbWebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
};

function mustGetEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function asString(x: unknown): string | null {
  return typeof x === 'string' && x.length ? x : null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRoleLabel(role: string): string {
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatMemberStatus(status: string): string {
  return formatRoleLabel(status);
}

async function createApnsJwt(params: { teamId: string; keyId: string; p8: string }): Promise<string> {
  const pk = await importPKCS8(params.p8, 'ES256');
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: params.keyId })
    .setIssuer(params.teamId)
    .setIssuedAt()
    .setExpirationTime('20m')
    .sign(pk);
}

async function sendApns(params: {
  deviceToken: string;
  bundleId: string;
  jwt: string;
  title: string;
  body: string;
  url?: string | null;
}): Promise<{ ok: boolean; status: number; text?: string }> {
  const payload = {
    aps: {
      alert: {
        title: params.title,
        body: params.body,
      },
      sound: 'default',
    },
    url: params.url ?? undefined,
  };

  const host = mustGetEnv('APNS_HOST');
  const endpoint = `https://${host}/3/device/${params.deviceToken}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `bearer ${params.jwt}`,
      'apns-topic': params.bundleId,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, text };
}

async function handleNotificationInsert(payload: DbWebhookPayload): Promise<Response> {
  const record = payload.record ?? {};
  const userId = asString(record['user_id']);
  const title = asString(record['title']) ?? 'Chapter Portal';
  const body = asString(record['message']) ?? 'You have a new update';
  const url = asString(record['link']);
  if (!userId) return new Response('Missing user_id', { status: 400 });

  const supabaseUrl = mustGetEnv('SUPABASE_URL');
  const serviceRoleKey = mustGetEnv('SUPABASE_SERVICE_ROLE_KEY');

  const apnsTeamId = mustGetEnv('APNS_TEAM_ID');
  const apnsKeyId = mustGetEnv('APNS_KEY_ID');
  const apnsP8 = mustGetEnv('APNS_P8_PRIVATE_KEY');
  const apnsBundleId = mustGetEnv('APNS_BUNDLE_ID');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const [{ data: tokens, error: tokensError }, { data: prefsRow }, { data: profileRow }] = await Promise.all([
    supabase.from('device_push_tokens').select('token').eq('user_id', userId).eq('platform', 'ios').eq('enabled', true),
    supabase.from('notification_preferences').select('email_notifications').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('email').eq('user_id', userId).maybeSingle(),
  ]);

  if (tokensError) throw tokensError;

  const deviceTokens = (tokens ?? []).map((t) => (t as { token: string }).token).filter(Boolean);

  const emailAllowed = prefsRow?.email_notifications !== false;

  const appOrigin = (Deno.env.get('PUBLIC_APP_URL') ?? Deno.env.get('APP_ORIGIN') ?? '').replace(/\/$/, '');

  let emailResult:
    | { sent: false; skipped: string }
    | { sent: true; status: number; id?: string | undefined }
    | { sent: false; error: string; status?: number } = { sent: false, skipped: 'not_attempted' };

  if (!emailAllowed) {
    emailResult = { sent: false, skipped: 'user_disabled_email' };
  } else {
    const toEmail = (profileRow as { email?: string } | null)?.email?.trim();
    if (!toEmail) {
      emailResult = { sent: false, skipped: 'no_profile_email' };
    } else {
      const absLink =
        url && (url.startsWith('http://') || url.startsWith('https://'))
          ? url
          : url && appOrigin
            ? `${appOrigin}${url.startsWith('/') ? url : `/${url}`}`
            : null;

      const safeTitle = escapeHtml(title);
      const safeBody = escapeHtml(body).replace(/\n/g, '<br />');
      const linkHtml = absLink
        ? `<p style="margin-top:16px"><a href="${escapeHtml(absLink)}">Open in app</a></p>`
        : url
          ? `<p style="margin-top:16px;color:#666;font-size:13px">Path: ${escapeHtml(url)} (set PUBLIC_APP_URL for a clickable link)</p>`
          : '';

      const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p style="font-size:18px;font-weight:600;margin:0 0 8px">${safeTitle}</p>
<p style="margin:0">${safeBody}</p>
${linkHtml}
<p style="margin-top:24px;font-size:12px;color:#888">You are receiving this because email notifications are enabled in your chapter portal settings.</p>
</body></html>`;

      const r = await sendEmail({
        to: toEmail,
        subject: title,
        html,
      });
      emailResult = r.ok
        ? { sent: true, status: 200, id: r.id }
        : { sent: false, error: r.error === 'email_unconfigured' ? 'email_unavailable' : 'email_send_failed' };
    }
  }

  let apnsResults: Array<{ ok: boolean; status: number; text?: string }> | null = null;
  let apnsFailures = 0;

  if (deviceTokens.length) {
    const jwt = await createApnsJwt({ teamId: apnsTeamId, keyId: apnsKeyId, p8: apnsP8 });
    apnsResults = await Promise.all(
      deviceTokens.map((deviceToken) =>
        sendApns({ deviceToken, bundleId: apnsBundleId, jwt, title, body, url })
      )
    );
    apnsFailures = apnsResults.filter((r) => !r.ok).length;
  }

  const apnsOk = !deviceTokens.length || apnsFailures === 0;

  const status = apnsOk ? 200 : 502;
  return new Response(
    JSON.stringify({
      ok: apnsOk,
      apns: deviceTokens.length
        ? { tokens: deviceTokens.length, failures: apnsFailures, results: apnsResults }
        : { skipped: 'no_device_tokens' },
      email: emailResult,
    }),
    {
      status,
      headers: { 'content-type': 'application/json' },
    }
  );
}

async function handleUserRoleInsert(payload: DbWebhookPayload): Promise<Response> {
  const record = payload.record ?? {};
  const userId = asString(record['user_id']);
  const role = asString(record['role']);
  if (!userId || !role) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_fields' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabaseUrl = mustGetEnv('SUPABASE_URL');
  const serviceRoleKey = mustGetEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const toEmail = (profileRow as { email?: string } | null)?.email?.trim();
  if (!toEmail) {
    return new Response(JSON.stringify({ ok: true, email: { sent: false, skipped: 'no_profile_email' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const first = (profileRow as { first_name?: string | null })?.first_name?.trim();
  const greeting = first ? `Hi ${escapeHtml(first)},` : 'Hi,';
  const label = formatRoleLabel(role);
  const subject = `Your chapter portal access was updated`;
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${greeting}</p>
<p>You have been assigned the <strong>${escapeHtml(label)}</strong> role in the chapter portal.</p>
<p style="margin-top:16px;font-size:14px;color:#555">If this looks wrong, contact a chapter officer.</p>
</body></html>`;

  const r = await sendEmail({ to: toEmail, subject, html });
  const emailResult = r.ok
    ? { sent: true as const, id: r.id }
    : { sent: false as const, error: r.error === 'email_unconfigured' ? 'email_unavailable' : 'email_send_failed' };

  return new Response(JSON.stringify({ ok: r.ok, email: emailResult }), {
    status: r.ok ? 200 : 502,
    headers: { 'content-type': 'application/json' },
  });
}

async function handleProfileStatusUpdate(payload: DbWebhookPayload): Promise<Response> {
  const record = payload.record ?? {};
  const old = payload.old_record ?? {};
  const newStatus = asString(record['status']);
  const prevStatus = asString(old['status']);
  if (!newStatus || newStatus === prevStatus) {
    return new Response(JSON.stringify({ ok: true, email: { skipped: 'status_unchanged' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const toEmail = asString(record['email'])?.trim();
  if (!toEmail) {
    return new Response(JSON.stringify({ ok: true, email: { sent: false, skipped: 'no_profile_email' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const first = asString(record['first_name']);
  const greeting = first ? `Hi ${escapeHtml(first)},` : 'Hi,';
  const subject = 'Your member status was updated';
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${greeting}</p>
<p>Your member status is now <strong>${escapeHtml(formatMemberStatus(newStatus))}</strong>.</p>
<p style="margin-top:16px;font-size:14px;color:#555">Open the chapter portal for more details.</p>
</body></html>`;

  const r = await sendEmail({ to: toEmail, subject, html });
  const emailResult = r.ok
    ? { sent: true as const, id: r.id }
    : { sent: false as const, error: r.error === 'email_unconfigured' ? 'email_unavailable' : 'email_send_failed' };

  return new Response(JSON.stringify({ ok: r.ok, email: emailResult }), {
    status: r.ok ? 200 : 502,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const payload = (await req.json()) as DbWebhookPayload;

    if (payload.schema !== 'public') {
      return new Response('Ignored', { status: 200 });
    }

    if (payload.table === 'notifications' && payload.type === 'INSERT') {
      return await handleNotificationInsert(payload);
    }

    if (payload.table === 'user_roles' && payload.type === 'INSERT') {
      return await handleUserRoleInsert(payload);
    }

    if (payload.table === 'profiles' && payload.type === 'UPDATE') {
      return await handleProfileStatusUpdate(payload);
    }

    return new Response('Ignored', { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[push-webhook]', msg);
    return new Response(JSON.stringify({ ok: false, error: 'internal_error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});
