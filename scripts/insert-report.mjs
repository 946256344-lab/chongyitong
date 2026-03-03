/**
 * Insert a report JSON into Supabase and print the access token.
 *
 * Usage (from project root):
 *   node scripts/insert-report.mjs en PM-2026-0047
 *   node scripts/insert-report.mjs zh PM-2026-0047
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Args ────────────────────────────────────────────────────
const [lang, reportId] = process.argv.slice(2);

if (!lang || !reportId) {
  console.error('Usage: node scripts/insert-report.mjs <lang> <reportId>');
  console.error('Example: node scripts/insert-report.mjs en PM-2026-0047');
  process.exit(1);
}

// ── Read JSON ───────────────────────────────────────────────
const jsonPath = join(__dir, '..', 'content', 'reports', lang, `${reportId}.json`);
let data;
try {
  data = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch {
  console.error(`Cannot read: ${jsonPath}`);
  process.exit(1);
}

// ── Supabase ────────────────────────────────────────────────
const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;   // service role bypasses RLS

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to your .env.local');
  console.error('Find it in: Supabase Dashboard → Project Settings → API → service_role (secret)');
  process.exit(1);
}

const supabase = createClient(url, key);

// ── Insert ──────────────────────────────────────────────────
const { data: row, error } = await supabase
  .from('reports')
  .insert({ lang, data })
  .select('token')
  .single();

if (error) {
  console.error('Insert failed:', error.message);
  process.exit(1);
}

const token = row.token;
console.log('\n✓ Report inserted successfully\n');
console.log(`  Report ID : ${reportId}`);
console.log(`  Language  : ${lang}`);
console.log(`  Token     : ${token}`);
console.log(`\n  Link to send to user:`);
console.log(`  https://severepetcondition.site/report/${token}\n`);
