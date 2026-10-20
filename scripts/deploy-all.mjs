/**
 * One-command deployment for Emo.
 *
 *   1. applies every SQL migration through the Supabase Management API
 *   2. links the project and deploys the three edge functions with the CLI
 *   3. sets the edge secrets (model key + VAPID pair)
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-all.mjs
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx OPENAI_API_KEY=sk-... node scripts/deploy-all.mjs
 *
 * The access token is a personal access token from
 * https://supabase.com/dashboard/account/tokens. It is read from the
 * environment and never written to disk.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const migrationsDir = join(root, 'supabase', 'migrations');

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'eaddiwghkxsewueioqoy';
const openAiKey = process.env.OPENAI_API_KEY;

// The VAPID pair generated for this project. The public half is already in
// .env (VITE_VAPID_PUBLIC_KEY); the private half must become an edge secret.
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ??
  'BJX9HLZmRyXe12WzFKGKTyE-KA1TQU5BpTKhqiqI4CxUxLg8hNgZas7upIs-_A0Xh0L9JLmz2ZbZ-9Lg8_SeMJA';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ?? 'PtLB8JWgJfpwM8B-O6TcmzEKMZ4iNaEH4aKfYnqQrQ4';

if (!token) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN.\n' +
      'Create one at https://supabase.com/dashboard/account/tokens and run:\n' +
      '  SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-all.mjs',
  );
  process.exit(1);
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

function readEnvValue(key) {
  try {
    const text = readFileSync(join(root, '.env'), 'utf8');
    const match = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------- migrations
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log(`\n▸ Applying ${files.length} migration(s) to ${projectRef}\n`);

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  process.stdout.write(`  ${file} ... `);

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
    console.error(`\n${file} could not be applied:\n${detail.slice(0, 1500)}\n`);
    process.exit(1);
  }

  console.log('ok');
}

// ------------------------------------------------------------------- secrets
console.log('\n▸ Setting edge secrets');
const secrets = [
  `VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}`,
  `VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}`,
  `PUSH_SUBJECT=${process.env.PUSH_SUBJECT ?? 'mailto:support@example.com'}`,
];
if (openAiKey) {
  secrets.push(`OPENAI_API_KEY=${openAiKey}`);
} else {
  const fromEnv = readEnvValue('OPENAI_API_KEY');
  if (fromEnv) secrets.push(`OPENAI_API_KEY=${fromEnv}`);
}

const secretCode = await run('supabase', [
  'secrets',
  'set',
  ...secrets,
  '--project-ref',
  projectRef,
]);
if (secretCode !== 0) {
  console.log('  (could not set secrets — set them manually if needed)');
}

// ----------------------------------------------------------------- functions
console.log('\n▸ Linking the project');
await run('supabase', ['link', '--project-ref', projectRef, '--password', token]);

console.log('\n▸ Deploying edge functions');
for (const fn of ['tutor-reply', 'content-gen', 'push-reminder']) {
  process.stdout.write(`  ${fn} ... `);
  const code = await run('supabase', ['functions', 'deploy', fn, '--project-ref', projectRef]);
  console.log(code === 0 ? 'ok' : 'FAILED');
}

console.log('\n▸ Done. The cron schedule for push reminders is in');
console.log('  supabase/functions/push-reminder/README.md — paste it into the SQL editor.');
console.log('');
