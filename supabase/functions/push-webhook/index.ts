/// <reference lib="deno.unstable" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6';

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

async function createApnsJwt(params: { teamId: string; keyId: string; p8: string }): Promise<string> {
  const pk = await importPKCS8(params.p8, 'ES256');
  return await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: params.keyId })
    .setIssuer(params.teamId)
    .setIssuedAt()
    // Apple docs recommend a short exp; use 20 minutes.
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

  // Sandbox vs production is controlled by SUPABASE_FUNCTIONS_APNS_HOST.
  // Use api.push.apple.com for prod, api.sandbox.push.apple.com for sandbox.
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

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const payload = (await req.json()) as DbWebhookPayload;
    if (payload.type !== 'INSERT' || payload.table !== 'notifications' || payload.schema !== 'public') {
      return new Response('Ignored', { status: 200 });
    }

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

    const { data: tokens, error } = await supabase
      .from('device_push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('platform', 'ios')
      .eq('enabled', true);

    if (error) throw error;
    const deviceTokens = (tokens ?? []).map((t) => (t as { token: string }).token).filter(Boolean);
    if (!deviceTokens.length) return new Response('No device tokens', { status: 200 });

    const jwt = await createApnsJwt({ teamId: apnsTeamId, keyId: apnsKeyId, p8: apnsP8 });

    const results = await Promise.all(
      deviceTokens.map((deviceToken) =>
        sendApns({ deviceToken, bundleId: apnsBundleId, jwt, title, body, url })
      )
    );

    const failures = results.filter((r) => !r.ok);
    const status = failures.length ? 502 : 200;
    return new Response(JSON.stringify({ ok: failures.length === 0, results }), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});

