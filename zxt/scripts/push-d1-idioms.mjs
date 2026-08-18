#!/usr/bin/env node
/**
 * push-d1-idioms.mjs
 * Pushes local idiom groups (zxt/data/chinese-idioms/idoms/group-*.json) to the remote D1-backed API.
 *
 * Usage: node zxt/scripts/push-d1-idioms.mjs
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dir = dirname(fileURLToPath(import.meta.url));
const IDIOMS_DIR = resolve(__dir, '../data/chinese-idioms/idoms');
const API_BASE = process.env.VITE_API_URL || 'https://zxtapi.vibequizzing.com';

// ── Load local ────────────────────────────────────────────────────────────────
if (!existsSync(IDIOMS_DIR)) {
  console.error(`❌ Local directory not found: ${IDIOMS_DIR}`);
  process.exit(1);
}

const files = readdirSync(IDIOMS_DIR).filter(f => f.startsWith('group-') && f.endsWith('.json'));
const localGroups = files.map(f => {
  const content = readFileSync(resolve(IDIOMS_DIR, f), 'utf8');
  return JSON.parse(content);
}).sort((a, b) => a.id - b.id);

console.log(`\n📂 Loaded ${localGroups.length} idiom group(s) from ${IDIOMS_DIR}\n`);

// ── Fetch remote ──────────────────────────────────────────────────────────────
console.log(`📡 Fetching current remote idiom groups for comparison …\n`);
let remoteGroups = [];
try {
  const res = await fetch(`${API_BASE}/api/idioms/groups`);
  if (res.ok) {
    const json = await res.json();
    remoteGroups = json.groups || [];
    console.log(`✅ Remote: ${remoteGroups.length} group(s) fetched\n`);
  } else {
    console.warn(`⚠️  Remote API returned ${res.status} — diff will be incomplete.\n`);
  }
} catch (e) {
  console.warn(`⚠️  Could not reach remote API: ${e.message}\n`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('═'.repeat(70));
console.log(`  PUSH IDIOM GROUPS REPORT — Local (${localGroups.length}) → Remote D1 (${remoteGroups.length})`);
console.log('═'.repeat(70));
localGroups.forEach(g => {
  console.log(`  Group #${g.id}: ${g.title} (${g.idioms?.length || 0} idioms, ${g.questions?.length || 0} questions)`);
});
console.log('═'.repeat(70) + '\n');

// ── Confirm ───────────────────────────────────────────────────────────────────
const isAutoYes = process.argv.includes('--yes') || process.argv.includes('-y');
if (!isAutoYes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve =>
    rl.question('🚀 Push local idiom groups to remote D1? [y/N] ', resolve)
  );
  rl.close();

  if (answer.trim().toLowerCase() !== 'y') {
    console.log('\n⛔ Push cancelled.\n');
    process.exit(0);
  }
}

// ── Push ──────────────────────────────────────────────────────────────────────
console.log(`\n🔑 Authenticating as admin (mmd) …`);
let token = '';
try {
  const authRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'mmd', password: 'zhiyuzhishan' }),
  });
  if (authRes.ok) {
    const authData = await authRes.json();
    token = authData.token || '';
    console.log(`✅ Authentication successful.`);
  } else {
    console.error(`❌ Authentication failed: ${authRes.status}`);
    process.exit(1);
  }
} catch (e) {
  console.error(`❌ Authentication request failed: ${e.message}`);
  process.exit(1);
}

console.log(`\n📤 Pushing ${localGroups.length} group(s) to D1 …`);
const pushRes = await fetch(`${API_BASE}/api/idioms/groups/batch`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ groups: localGroups }),
});

if (!pushRes.ok) {
  const text = await pushRes.text();
  console.error(`❌ Push failed (${pushRes.status}): ${text}`);
  process.exit(1);
}

const result = await pushRes.json();
console.log(`\n✅ Push successful! ${result.count} group(s) now in D1.\n`);
