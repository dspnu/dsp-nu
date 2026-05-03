import { createRemoteJWKSet, jwtVerify } from 'jose';

export function createSupabaseJwtVerifier(supabaseUrl: string) {
  const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl.replace(/\/$/, ''));
  const JWKS = createRemoteJWKSet(jwksUrl);
  const issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;

  return async function verifyAccessToken(token: string): Promise<{ sub: string }> {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
      audience: 'authenticated',
    });
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new Error('Invalid token: missing sub');
    }
    return { sub: payload.sub };
  };
}
