/**
 * Applies the SQL migrations to a Supabase project through the Management
 * API — no CLI, no psql, no manual copy/paste into the SQL editor.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-migrations.mjs
 *
 * The token is a personal access token from
 * https://supabase.com/dashboard/account/tokens — it is only needed for this
 * script and is never committed.
 *
 * Edge functions still need the CLI (they are deployed as containers):
 *   supabase functions deploy tutor-reply
 *   supabase functions deploy content-gen
 *   supabase functions deploy push-reminder
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'supabase', 'migrations');

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'eaddiwghkxsewueioqoy';

if (!token) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN.\n' +
      'Create one at https://supabase.com/dashboard/account/tokens and run:\n' +
      '  SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-migrations.mjs',
  );
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`Applying ${files.length} migration(s) to project ${projectRef}...\n`);

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  process.stdout.write(`  • ${file} ... `);

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.log('FAILED');
    console.error(`\n${file} could not be applied:\n${detail.slice(0, 1200)}\n`);
    process.exit(1);
  }

  console.log('ok');
}

console.log('\nAll migrations applied.');
console.log('\nNext steps:');
console.log('  supabase functions deploy tutor-reply');
console.log('  supabase functions deploy content-gen');
console.log('  supabase functions deploy push-reminder');
console.log('  supabase secrets set OPENAI_API_KEY=sk-...');
console.log('  supabase secrets set VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=...');
