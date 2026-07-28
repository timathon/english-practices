#!/usr/bin/env node
/**
 * push-d1-poems.mjs
 * Pushes local poems-75.json to the remote D1-backed API.
 *
 * Steps:
 *   1. Fetch current remote poems → save as poems-75-remote.json
 *   2. Run diff report (same as fetch-d1-poems.mjs)
 *   3. Prompt user to confirm the push
 *   4. If confirmed: POST all local poems to /api/blg/poems/batch
 *
 * Usage: node zxt/scripts/push-d1-poems.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dir, '../data/blg');
const REMOTE_FILE = resolve(DATA_DIR, 'poems-75-remote.json');
const LOCAL_FILE = resolve(DATA_DIR, 'poems-75.json');
const DIFF_FILE = resolve(DATA_DIR, 'poems-diff-report.txt');
const API_BASE = 'https://zxtapi.vibequizzing.com';

// ── Load local ────────────────────────────────────────────────────────────────
if (!existsSync(LOCAL_FILE)) {
  console.error(`❌ Local file not found: ${LOCAL_FILE}`);
  process.exit(1);
}
const localPoems = JSON.parse(readFileSync(LOCAL_FILE, 'utf8'));
console.log(`\n📂 Loaded ${localPoems.length} poems from local poems-75.json\n`);

// ── Fetch remote ──────────────────────────────────────────────────────────────
console.log(`📡 Fetching current remote poems for comparison …\n`);
let remotePoems = [];
try {
  const res = await fetch(`${API_BASE}/api/blg/poems`);
  if (res.ok) {
    const json = await res.json();
    remotePoems = json.poems || [];
    writeFileSync(REMOTE_FILE, JSON.stringify(remotePoems, null, 2), 'utf8');
    console.log(`✅ Remote: ${remotePoems.length} poems fetched and saved → ${REMOTE_FILE}\n`);
  } else {
    console.warn(`⚠️  Remote API returned ${res.status} — diff will be incomplete.\n`);
  }
} catch (e) {
  console.warn(`⚠️  Could not reach remote API: ${e.message}\n`);
}

// ── Diff ──────────────────────────────────────────────────────────────────────
const localMap = new Map(localPoems.map(p => [p.id, p]));
const remoteMap = new Map(remotePoems.map(p => [p.id, p]));

const lines = [];
const log = (msg) => { lines.push(msg); console.log(msg); };

log('═'.repeat(70));
log('  PUSH DIFF REPORT — Local (poems-75.json) → Remote (D1)');
log(`  Generated: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
log('═'.repeat(70));

const onlyLocal = [...localMap.keys()].filter(id => !remoteMap.has(id));
if (onlyLocal.length) {
  log(`\n📋 NEW POEMS (local only, will be added to D1) — ${onlyLocal.length}:`);
  onlyLocal.forEach(id => {
    const p = localMap.get(id);
    log(`  + #${id} 《${p.title}》 — ${p.dynasty} · ${p.author}`);
  });
}

const onlyRemote = [...remoteMap.keys()].filter(id => !localMap.has(id));
if (onlyRemote.length) {
  log(`\n⚠️  POEMS IN REMOTE BUT NOT IN LOCAL (will be REPLACED/REMOVED) — ${onlyRemote.length}:`);
  onlyRemote.forEach(id => {
    const p = remoteMap.get(id);
    log(`  - #${id} 《${p.title}》 — ${p.dynasty} · ${p.author}`);
  });
}

const sharedIds = [...localMap.keys()].filter(id => remoteMap.has(id));
const diffPoems = [];
for (const id of sharedIds) {
  const local = localMap.get(id);
  const remote = remoteMap.get(id);
  if (JSON.stringify(local) !== JSON.stringify(remote)) {
    const diffs = [];
    for (const field of ['title', 'dynasty', 'author', 'theme', 'cn', 'en']) {
      if (local[field] !== remote[field]) {
        diffs.push(`  ${field}: "${local[field]}" ← was "${remote[field]}"`);
      }
    }
    const localQ = (local.questions || []).length;
    const remoteQ = (remote.questions || []).length;
    if (localQ !== remoteQ) {
      diffs.push(`  questions: ${remoteQ} → ${localQ}`);
    } else {
      const lqs = local.questions || [];
      const rqs = remote.questions || [];
      const changedQs = lqs.filter((lq, i) => JSON.stringify(lq) !== JSON.stringify(rqs[i]));
      if (changedQs.length) diffs.push(`  ${changedQs.length} question(s) content changed`);
    }
    diffPoems.push({ id, title: local.title, diffs });
  }
}

if (diffPoems.length) {
  log(`\n📝 CHANGED POEMS (${diffPoems.length} / ${sharedIds.length}):`);
  for (const { id, title, diffs } of diffPoems) {
    log(`\n  #${id} 《${title}》`);
    diffs.forEach(d => log(d));
  }
}

const totalChanges = onlyLocal.length + onlyRemote.length + diffPoems.length;
log('\n' + '═'.repeat(70));
if (totalChanges === 0) {
  log('  ✅ No differences — local and remote are identical.');
} else {
  log(`  ⚠️  ${totalChanges} change group(s) will be applied to D1.`);
  log(`  Push will REPLACE all ${localPoems.length} poems in D1 with local data.`);
}
log('═'.repeat(70) + '\n');

writeFileSync(DIFF_FILE, lines.join('\n'), 'utf8');
console.log(`📄 Diff report saved → ${DIFF_FILE}\n`);

if (totalChanges === 0) {
  console.log('Nothing to push. Exiting.\n');
  process.exit(0);
}

// ── Confirm ───────────────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise(resolve =>
  rl.question('🚀 Push local poems-75.json to remote D1? [y/N] ', resolve)
);
rl.close();

if (answer.trim().toLowerCase() !== 'y') {
  console.log('\n⛔ Push cancelled.\n');
  process.exit(0);
}

// ── Push ──────────────────────────────────────────────────────────────────────
console.log(`\n📤 Pushing ${localPoems.length} poems to D1 …`);
const pushRes = await fetch(`${API_BASE}/api/blg/poems/batch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ poems: localPoems }),
});

if (!pushRes.ok) {
  const text = await pushRes.text();
  console.error(`❌ Push failed (${pushRes.status}): ${text}`);
  process.exit(1);
}

const result = await pushRes.json();
console.log(`\n✅ Push successful! ${result.count} poems now in D1.\n`);
