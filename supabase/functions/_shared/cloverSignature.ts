/**
 * Hosted Checkout webhook signing (Clover docs: append `t` + `.` + raw body, HMAC-SHA256 with signing secret, compare to `v1`).
 */
export async function verifyCloverHostedCheckoutSignature(
  rawBody: string,
  cloverSignatureHeader: string | null,
  signingSecret: string,
): Promise<boolean> {
  if (!cloverSignatureHeader || !signingSecret) return false;

  let timestamp = '';
  let v1 = '';
  for (const part of cloverSignatureHeader.split(',')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key === 't') timestamp = val;
    if (key === 'v1') v1 = val.toLowerCase();
  }
  if (!timestamp || !v1) return false;

  const enc = new TextEncoder();
  const keyMaterial = enc.encode(signingSecret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(`${timestamp}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) {
    diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}
