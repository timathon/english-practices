#!/usr/bin/env node
/**
 * fetch-d1-poems.mjs
 * Fetches all poem data from the remote D1-backed API and saves it to
 * zxt/data/blg/poems-75-remote.json, then compares it to the local
 * poems-75.json and logs a human-readable diff report.
 *
 * Usage: node zxt/scripts/fetch-d1-poems.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dir, '../data/blg');
const REMOTE_FILE = resolve(DATA_DIR, 'poems-75-remote.json');
const LOCAL_FILE = resolve(DATA_DIR, 'poems-75.json');
const DIFF_FILE = resolve(DATA_DIR, 'poems-diff-report.txt');
const API_URL = 'https://zxtapi.vibequizzing.com/api/blg/poems';

// ── Fetch remote ──────────────────────────────────────────────────────────────
console.log(`\n📡 Fetching poems from ${API_URL} …\n`);
const res = await fetch(API_URL);
if (!res.ok) {
  console.error(`❌ API returned ${res.status}: ${res.statusText}`);
  process.exit(1);
}
const json = await res.json();
const remotePoems = json.poems;
if (!Array.isArray(remotePoems)) {
  console.error('❌ Unexpected response structure — missing "poems" array.');
  process.exit(1);
}

writeFileSync(REMOTE_FILE, JSON.stringify(remotePoems, null, 2), 'utf8');
console.log(`✅ Saved ${remotePoems.length} poems → ${REMOTE_FILE}\n`);

// ── Load local ────────────────────────────────────────────────────────────────
if (!existsSync(LOCAL_FILE)) {
  console.log('ℹ️  No local poems-75.json found — skipping diff.');
  process.exit(0);
}
const localPoems = JSON.parse(readFileSync(LOCAL_FILE, 'utf8'));

// ── Compare ───────────────────────────────────────────────────────────────────
const localMap = new Map(localPoems.map(p => [p.id, p]));
const remoteMap = new Map(remotePoems.map(p => [p.id, p]));

const lines = [];
const log = (msg) => { lines.push(msg); console.log(msg); };

log('═'.repeat(70));
log('  POEMS DIFF REPORT — Local (poems-75.json) vs Remote (D1)');
log(`  Generated: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
log('═'.repeat(70));

// Poems only in local
const onlyLocal = [...localMap.keys()].filter(id => !remoteMap.has(id));
if (onlyLocal.length) {
  log(`\n📋 ONLY IN LOCAL (${onlyLocal.length}):`);
  onlyLocal.forEach(id => {
    const p = localMap.get(id);
    log(`  #${id} 《${p.title}》 — ${p.dynasty} · ${p.author}`);
  });
}

// Poems only in remote
const onlyRemote = [...remoteMap.keys()].filter(id => !localMap.has(id));
if (onlyRemote.length) {
  log(`\n🌐 ONLY IN REMOTE (${onlyRemote.length}):`);
  onlyRemote.forEach(id => {
    const p = remoteMap.get(id);
    log(`  #${id} 《${p.title}》 — ${p.dynasty} · ${p.author}`);
  });
}

// Poems in both — check for diffs
const sharedIds = [...localMap.keys()].filter(id => remoteMap.has(id));
const diffPoems = [];

for (const id of sharedIds) {
  const local = localMap.get(id);
  const remote = remoteMap.get(id);
  const diffs = [];

  // Metadata fields
  for (const field of ['title', 'dynasty', 'author', 'theme', 'cn', 'en']) {
    if (local[field] !== remote[field]) {
      diffs.push(`  ${field}: LOCAL="${local[field]}" | REMOTE="${remote[field]}"`);
    }
  }

  // Questions count
  const localQ = (local.questions || []).length;
  const remoteQ = (remote.questions || []).length;
  if (localQ !== remoteQ) {
    diffs.push(`  questions count: LOCAL=${localQ} | REMOTE=${remoteQ}`);
  }

  // Questions content diff (by question id)
  const localQMap = new Map((local.questions || []).map(q => [q.id, q]));
  const remoteQMap = new Map((remote.questions || []).map(q => [q.id, q]));
  const qDiffs = [];
  for (const [qid, lq] of localQMap) {
    const rq = remoteQMap.get(qid);
    if (!rq) {
      qDiffs.push(`    + LOCAL ONLY: ${qid} (${lq.type})`);
    } else if (JSON.stringify(lq) !== JSON.stringify(rq)) {
      qDiffs.push(`    ~ CHANGED: ${qid} (${lq.type})`);
      // Show specific field diffs
      for (const f of ['prompt', 'answer', 'explanation']) {
        if (JSON.stringify(lq[f]) !== JSON.stringify(rq[f])) {
          qDiffs.push(`      .${f}: LOCAL=${JSON.stringify(lq[f])} REMOTE=${JSON.stringify(rq[f])}`);
        }
      }
      if (JSON.stringify(lq.options) !== JSON.stringify(rq.options)) {
        qDiffs.push(`      .options: LOCAL=${JSON.stringify(lq.options)} REMOTE=${JSON.stringify(rq.options)}`);
      }
    }
  }
  for (const [qid, rq] of remoteQMap) {
    if (!localQMap.has(qid)) {
      qDiffs.push(`    + REMOTE ONLY: ${qid} (${rq.type})`);
    }
  }
  if (qDiffs.length) {
    diffs.push(`  questions diff (${qDiffs.length} changes):`);
    diffs.push(...qDiffs);
  }

  if (diffs.length) diffPoems.push({ id, title: local.title, diffs });
}

if (diffPoems.length) {
  log(`\n📝 POEMS WITH DIFFERENCES (${diffPoems.length} / ${sharedIds.length}):`);
  for (const { id, title, diffs } of diffPoems) {
    log(`\n  #${id} 《${title}》`);
    diffs.forEach(d => log(d));
  }
} else {
  log('\n✅ All shared poems are identical between local and remote.');
}

const identical = onlyLocal.length === 0 && onlyRemote.length === 0 && diffPoems.length === 0;
log('\n' + '═'.repeat(70));
log(`  Summary: ${identical ? '✅ LOCAL == REMOTE (no differences)' : `⚠️  Differences found`}`);
log(`  Local: ${localPoems.length} poems | Remote: ${remotePoems.length} poems`);
log('═'.repeat(70) + '\n');

writeFileSync(DIFF_FILE, lines.join('\n'), 'utf8');
console.log(`\n📄 Diff report saved → ${DIFF_FILE}\n`);
