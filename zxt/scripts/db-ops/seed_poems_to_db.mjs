#!/usr/bin/env node
/**
 * seed_poems_to_db.mjs
 * 
 * Merges individual poem JSON files from zxt/data/blg/poems/ into local
 * `poems-75.json` and pushes the updated dataset to the remote Cloudflare D1 database.
 * 
 * Usage:
 *   node zxt/scripts/db-ops/seed_poems_to_db.mjs               # seed all poems found in zxt/data/blg/poems/
 *   node zxt/scripts/db-ops/seed_poems_to_db.mjs 21-50         # seed poems 21 to 50
 *   node zxt/scripts/db-ops/seed_poems_to_db.mjs --range 21-50 # range format
 *   node zxt/scripts/db-ops/seed_poems_to_db.mjs --id 8        # single poem
 *   node zxt/scripts/db-ops/seed_poems_to_db.mjs --start 21 --end 50
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, '../../../');
const POEMS_DIR = path.resolve(REPO_ROOT, 'zxt/data/blg/poems');
const POEMS_75_PATH = path.resolve(REPO_ROOT, 'zxt/data/blg/poems-75.json');
const API_POEMS_PATH = path.resolve(REPO_ROOT, 'zxt/api/data/poems-75.json');
const API_BASE = 'https://zxtapi.vibequizzing.com';

function parseTargetIds() {
  const args = process.argv.slice(2);
  let targetIds = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--id' && args[i + 1]) {
      const id = parseInt(args[i + 1], 10);
      if (!isNaN(id)) targetIds = new Set([id]);
      i++;
    } else if (arg === '--range' && args[i + 1]) {
      const [start, end] = args[i + 1].split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        targetIds = new Set();
        for (let num = Math.min(start, end); num <= Math.max(start, end); num++) {
          targetIds.add(num);
        }
      }
      i++;
    } else if (arg === '--start' && args[i + 1]) {
      const start = parseInt(args[i + 1], 10);
      let end = start;
      if (args[i + 2] === '--end' && args[i + 3]) {
        end = parseInt(args[i + 3], 10);
        i += 2;
      }
      if (!isNaN(start) && !isNaN(end)) {
        targetIds = new Set();
        for (let num = Math.min(start, end); num <= Math.max(start, end); num++) {
          targetIds.add(num);
        }
      }
      i++;
    } else if (/^\d+-\d+$/.test(arg)) {
      const [start, end] = arg.split('-').map(Number);
      targetIds = new Set();
      for (let num = Math.min(start, end); num <= Math.max(start, end); num++) {
        targetIds.add(num);
      }
    } else if (/^\d+$/.test(arg)) {
      const id = parseInt(arg, 10);
      targetIds = new Set([id]);
    }
  }

  return targetIds;
}

async function main() {
  if (!fs.existsSync(POEMS_DIR)) {
    console.error(`❌ Poems directory not found: ${POEMS_DIR}`);
    process.exit(1);
  }

  const targetIds = parseTargetIds();
  const availableFiles = fs.readdirSync(POEMS_DIR).filter(f => f.endsWith('.json'));

  let poemsToLoad = [];
  if (targetIds && targetIds.size > 0) {
    const sortedTargets = Array.from(targetIds).sort((a, b) => a - b);
    console.log(`\n🎯 Filtering target poem IDs: [${sortedTargets.join(', ')}]`);
    for (const id of sortedTargets) {
      const file = availableFiles.find(f => f.startsWith(`${id}-`) && f.endsWith('.json'));
      if (file) {
        poemsToLoad.push(file);
      } else {
        console.warn(`⚠️ Warning: No JSON file found for Poem #${id} in ${POEMS_DIR}`);
      }
    }
  } else {
    poemsToLoad = availableFiles;
    console.log(`\n📂 Loading all ${poemsToLoad.length} poem JSON files from ${POEMS_DIR}...`);
  }

  if (poemsToLoad.length === 0) {
    console.error('❌ No poems matched criteria to seed.');
    process.exit(1);
  }

  // Load existing local master dataset
  let poems75 = [];
  if (fs.existsSync(POEMS_75_PATH)) {
    try {
      poems75 = JSON.parse(fs.readFileSync(POEMS_75_PATH, 'utf8'));
    } catch (_) {}
  }

  const map = new Map(poems75.map(p => [p.id, p]));

  console.log(`\n📖 Merging ${poemsToLoad.length} poem(s) into master dataset:`);
  for (const filename of poemsToLoad) {
    const fullPath = path.join(POEMS_DIR, filename);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    map.set(data.id, data);
    console.log(`  ✓ #${data.id} 《${data.title}》 [${data.dynasty} · ${data.author}] (${data.questions?.length || 0} questions)`);
  }

  const updatedMaster = Array.from(map.values()).sort((a, b) => a.id - b.id);

  // Write to local json files
  fs.writeFileSync(POEMS_75_PATH, JSON.stringify(updatedMaster, null, 2), 'utf8');
  console.log(`\n💾 Saved local ${POEMS_75_PATH} (${updatedMaster.length} total poems)`);

  if (fs.existsSync(path.dirname(API_POEMS_PATH))) {
    fs.writeFileSync(API_POEMS_PATH, JSON.stringify(updatedMaster, null, 2), 'utf8');
    console.log(`💾 Saved API copy ${API_POEMS_PATH}`);
  }

  // Push batch to Cloudflare D1
  console.log(`\n📡 Pushing ${updatedMaster.length} poems to remote D1 API (${API_BASE}/api/blg/poems/batch)...`);

  try {
    const pushRes = await fetch(`${API_BASE}/api/blg/poems/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock_admin_token',
      },
      body: JSON.stringify({ poems: updatedMaster }),
    });

    if (!pushRes.ok) {
      const text = await pushRes.text();
      console.error(`❌ Push failed (${pushRes.status}): ${text}`);
      process.exit(1);
    }

    const result = await pushRes.json();
    console.log(`\n🎉 Seed to Cloudflare D1 Successful! Total count in D1: ${result.count}\n`);
  } catch (err) {
    console.error(`❌ Network error while pushing to D1:`, err.message);
    process.exit(1);
  }
}

main();
