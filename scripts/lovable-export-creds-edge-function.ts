/**
 * ONE-TIME helper: deploy this to Lovable Cloud to read migration credentials.
 * After migration, DELETE this function and rotate secrets.
 *
 * Deploy: copy to supabase/functions/migration-export-creds/index.ts in Lovable,
 *         set secret MIGRATION_ACCESS_KEY to a random string, deploy, then:
 *   curl -H "x-migration-key: YOUR_KEY" \
 *     https://agmawqmymdpcrcelxuzc.supabase.co/functions/v1/migration-export-creds
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';

Deno.serve(async (req) => {
  const expected = Deno.env.get('MIGRATION_ACCESS_KEY') ?? '';
  const provided = req.headers.get('x-migration-key') ?? '';
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  return new Response(
    JSON.stringify({
      supabase_url: Deno.env.get('SUPABASE_URL'),
      service_role_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      db_url: Deno.env.get('SUPABASE_DB_URL'),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
