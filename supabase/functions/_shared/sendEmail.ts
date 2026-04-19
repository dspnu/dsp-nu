/// <reference lib="deno.unstable" />
import { Resend } from 'npm:resend@4.1.2';

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id: string | undefined }
  | { ok: false; error: string };

function getApiKey(): string | null {
  return (Deno.env.get('RESEND_API_KEY') ?? Deno.env.get('RESEND_API') ?? '').trim() || null;
}

function getFromAddress(): string | null {
  const v = (Deno.env.get('RESEND_FROM_EMAIL') ?? '').trim();
  return v || null;
}

/**
 * Sends one transactional email via Resend. Runs only in Edge Functions (server).
 * Never import this module from client-side code.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = getApiKey();
  const from = getFromAddress();

  if (!apiKey) {
    console.error('[sendEmail] Missing RESEND_API_KEY (or legacy RESEND_API)');
    return { ok: false, error: 'email_unconfigured' };
  }
  if (!from) {
    console.error('[sendEmail] Missing RESEND_FROM_EMAIL');
    return { ok: false, error: 'email_unconfigured' };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error('[sendEmail] Resend error:', error.name, error.message);
      return { ok: false, error: 'email_send_failed' };
    }

    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[sendEmail] Unexpected error:', msg);
    return { ok: false, error: 'email_send_failed' };
  }
}
