#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { execSync } = require('child_process');
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { getAudioBatch } = require('./tts-gen-cut-save-3.cjs');

// ── Environment Configuration ──────────────────────────────────────────────────
const GOOGLE_API_KEY_FREE = process.env.GOOGLE_API_KEY_FREE;
if (!GOOGLE_API_KEY_FREE) {
    console.error('❌  GOOGLE_API_KEY_FREE is not set in your environment.');
    process.exit(1);
}

// Set it so that tts-gen-cut-save-3.cjs uses the free key
process.env.GOOGLE_API_KEY = GOOGLE_API_KEY_FREE;

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.error('❌  AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not set.');
    process.exit(1);
}

// ── S3 / R2 Configuration ──────────────────────────────────────────────────────
const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";
const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

// ── Helpers ────────────────────────────────────────────────────────────────────
function getCleanText(text) {
    if (!text) return "";
    return text.trim();
}

async function checkAudioExists(text, bookName) {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const r2Key = `ep/${bookName}/${hash}.mp3`;
    try {
        await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key }));
        return { text, exists: true, hash, r2Key };
    } catch (e) {
        return { text, exists: false, hash, r2Key };
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const inputFile = process.argv[2];
    if (!inputFile) {
        console.error("Usage: node scripts/tts-xl.cjs [passage_decoder_json_path]");
        process.exit(1);
    }

    const absoluteFile = path.resolve(inputFile);
    if (!fs.existsSync(absoluteFile) || !fs.statSync(absoluteFile).isFile()) {
        console.error(`❌ File not found: ${absoluteFile}`);
        process.exit(1);
    }

    const relativeToData = path.relative(path.resolve(__dirname, '../data'), absoluteFile);
    const bookName = relativeToData.split(path.sep)[0].toLowerCase();

    console.log(`📖 Reading file: ${absoluteFile}`);
    console.log(`Resolved book/category name: ${bookName}`);

    const content = JSON.parse(fs.readFileSync(absoluteFile, 'utf8'));

    if (!content.sections || !Array.isArray(content.sections)) {
        console.error("❌ Invalid JSON: 'sections' array not found.");
        process.exit(1);
    }

    console.log("\nAvailable Sections:");
    content.sections.forEach((section, idx) => {
        console.log(`  [${idx + 1}] ${section.title || `Section ${idx + 1}`}`);
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("\nChoose a section to process (1-" + content.sections.length + ") or 'all' to process all sections: ", async (answer) => {
        rl.close();
        let selectedSections = [];

        const trimmedAns = answer.trim().toLowerCase();
        if (trimmedAns === 'all') {
            selectedSections = content.sections;
            console.log("Selected all sections.");
        } else {
            const idx = parseInt(trimmedAns, 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= content.sections.length) {
                console.error("❌ Invalid choice. Exiting.");
                process.exit(1);
            }
            selectedSections = [content.sections[idx]];
            console.log(`Selected section: "${selectedSections[0].title}"`);
        }

        // Collect all sentences to process
        const textsSet = new Set();
        selectedSections.forEach(section => {
            if (section.sentences && Array.isArray(section.sentences)) {
                section.sentences.forEach(item => {
                    if (item.en) textsSet.add(getCleanText(item.en));
                });
            }
        });

        const uniqueTexts = Array.from(textsSet).filter(Boolean);
        console.log(`\nFound ${uniqueTexts.length} unique sentences to check.`);

        const forceRegenerate = process.argv.includes('--regenerate');
        let missingTasks = [];
        let existingTasks = [];
        const checkedTasks = [];

        if (forceRegenerate) {
            console.log(`--regenerate flag active. Forcing regeneration of all ${uniqueTexts.length} items...`);
            for (let i = 0; i < uniqueTexts.length; i++) {
                const text = uniqueTexts[i];
                const hash = crypto.createHash('md5').update(text).digest('hex');
                const r2Key = `ep/${bookName}/${hash}.mp3`;
                checkedTasks.push({ text, exists: false, hash, r2Key });
            }
            missingTasks = checkedTasks;
        } else {
            console.log("Checking R2 to see which audios already exist...");
            for (let i = 0; i < uniqueTexts.length; i++) {
                const text = uniqueTexts[i];
                const check = await checkAudioExists(text, bookName);
                checkedTasks.push(check);
            }
            missingTasks = checkedTasks.filter(t => !t.exists);
            existingTasks = checkedTasks.filter(t => t.exists);
        }

        const generationLog = [];

        // Log existing tasks
        existingTasks.forEach(t => {
            generationLog.push({
                batchId: 'R2_EXISTING',
                folderName: '',
                text: t.text,
                hash: t.hash,
                status: 1,
                isRemote: true
            });
        });

        if (missingTasks.length > 0) {
            console.log(`⏭️  Skipping ${existingTasks.length} already existing audios.`);
            console.log(`🚨  Missing ${missingTasks.length} audios.`);
            // Calculate a generous dynamic timeout proportional to the text length (e.g. 1.5 seconds per word, minimum 90 seconds)
            const totalWords = missingTasks.reduce((acc, t) => acc + (t.text || "").split(/\s+/).length, 0);
            const calculatedTimeout = Math.max(90000, totalWords * 1500);
            console.log(`⏱️  Setting timeout to ${calculatedTimeout / 1000}s based on word count (${totalWords} words).`);

            const result = await getAudioBatch(missingTasks, bookName, { skipUpload: false, timeout: calculatedTimeout });

            if (result.success) {
                console.log("\n✨  Generation complete!");
                if (result.files && result.batchId) {
                    for (const f of result.files) {
                        generationLog.push({
                            batchId: result.batchId,
                            folderName: result.folderName,
                            text: f.text,
                            hash: f.hash,
                            status: f.status,
                            isRemote: false
                        });
                    }
                }
                
                content.tts = { by: "gemini" };
                fs.writeFileSync(absoluteFile, JSON.stringify(content, null, 2), 'utf8');
                console.log(`📝 Updated JSON file metadata.`);
            } else {
                console.error(`❌ Generation failed: ${result.reason}`);
                process.exit(1);
            }
        } else {
            console.log("✨  All audios already exist. Nothing to generate!");
        }

        // Write HTML report
        if (generationLog.length > 0) {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
            const reportDir = path.resolve(__dirname, '../temp/audio');
            if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
            const reportPath = path.join(reportDir, `tts-report-xl-${ts}.html`);

            const failCount = generationLog.filter(e => e.status === 2).length;
            const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

            const tableRows = generationLog.map(({ batchId, folderName, text, hash, status, isRemote }, idx) => {
                let audioSrc = '';
                if (isRemote) {
                    audioSrc = `${PUBLIC_URL_BASE}/ep/${bookName}/${hash}.mp3`;
                } else {
                    const dirName = folderName || `batch_${batchId}`;
                    audioSrc = `${dirName}/${hash}.mp3`;
                }

                const statusCell = status === 1
                    ? `<span class="badge ok">${isRemote ? 'R2 EXISTING' : '✅ 1'}</span>`
                    : `<span class="badge fail">❌ 2</span>`;
                
                const audioCell = audioSrc
                    ? `<audio controls preload="none"><source src="${esc(audioSrc)}" type="audio/mpeg"></audio>`
                    : `<span class="na">—</span>`;

                let durationStr = '—';
                let isTooDifferent = false;

                if (!isRemote && hash) {
                    const dirName = folderName || `batch_${batchId}`;
                    const audioPathOnDisk = path.join(reportDir, dirName, `${hash}.mp3`);
                    if (fs.existsSync(audioPathOnDisk)) {
                        try {
                            const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPathOnDisk}"`, { encoding: 'utf8' });
                            const duration = parseFloat(out.trim());
                            if (!isNaN(duration)) {
                                const words = text.split(/\s+/).filter(Boolean);
                                const wordCount = words.length;
                                const estMin = Math.max(0.2, wordCount * 0.15);
                                const estMax = Math.max(3.0, wordCount * 0.9 + 2.0);
                                isTooDifferent = duration < estMin || duration > estMax || duration === 0;
                                durationStr = `${duration.toFixed(2)}s <span style="font-size:0.75rem;opacity:0.6;">(est: ${(wordCount * 0.35 + 0.5).toFixed(1)}s)</span>`;
                            }
                        } catch (err) {
                            console.error("Error reading mp3 duration:", err.message);
                        }
                    }
                }

                return `
            <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
              <td class="mono">${esc(batchId)}</td>
              <td class="sentence">${esc(text)}</td>
              <td class="mono hash" title="${esc(hash || '')}">${hash ? hash.slice(0, 8) + '…' : ''}</td>
              <td>${statusCell}</td>
              <td class="mono duration-cell${isTooDifferent ? ' bad-duration' : ''}">${durationStr}</td>
              <td class="audio-cell">${audioCell}</td>
            </tr>`;
            }).join('');

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TTS Report (XL) · ${esc(bookName)} · ${ts}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      padding: 2rem;
      min-height: 100vh;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #a78bfa;
      margin-bottom: 0.25rem;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin: 1rem 0 1.75rem;
    }
    .meta-item {
      background: #1e2130;
      border: 1px solid #2d3148;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .meta-item strong { color: #e2e8f0; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    thead {
      background: #1e1b4b;
    }
    th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #a5b4fc;
      border-bottom: 2px solid #312e81;
    }
    tr.even { background: #13151f; }
    tr.odd  { background: #0f1117; }
    tr:hover { background: #1a1d2e; }
    td {
      padding: 0.6rem 1rem;
      border-bottom: 1px solid #1e2130;
      vertical-align: middle;
    }
    td.mono {
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 0.78rem;
      color: #7dd3fc;
    }
    td.bad-duration {
      color: #fca5a5 !important;
      background-color: #7f1d1d !important;
      font-weight: bold;
    }
    td.hash { cursor: default; }
    td.sentence { color: #e2e8f0; line-height: 1.5; }
    td.audio-cell { min-width: 220px; }
    audio {
      height: 32px;
      width: 100%;
      accent-color: #a78bfa;
      filter: invert(0.05) hue-rotate(200deg);
    }
    .badge {
      display: inline-block;
      font-size: 0.78rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 99px;
    }
    .badge.ok   { background: #14532d; color: #86efac; }
    .badge.fail { background: #450a0a; color: #fca5a5; }
    .na { color: #475569; }
    footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.72rem;
      color: #334155;
    }
  </style>
</head>
<body>
  <h1>🎙️ TTS Generation Report (XL)</h1>
  <div class="meta">
    <div class="meta-item"><strong>Book:</strong> ${esc(bookName)}</div>
    <div class="meta-item"><strong>Generated:</strong> ${now.toISOString()}</div>
    <div class="meta-item"><strong>Total:</strong> ${generationLog.length} sentences</div>
    <div class="meta-item"><strong>Failed:</strong> ${failCount}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Batch ID</th>
        <th>Sentence</th>
        <th>Hash</th>
        <th>Status</th>
        <th>Duration</th>
        <th>Audio</th>
      </tr>
    </thead>
    <tbody>${tableRows}
    </tbody>
  </table>
  <footer>Generated by tts-xl.cjs &mdash; ${ts}</footer>
</body>
</html>`;

            fs.writeFileSync(reportPath, html, 'utf8');
            console.log(`📄 Generation report saved: ${reportPath}`);

            try {
                const isWsl = fs.existsSync('/proc/version') && fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
                if (isWsl) {
                    const winPath = execSync(`wslpath -w "${reportPath}"`, { encoding: 'utf8' }).trim();
                    const escapedPath = winPath.replace(/\\/g, '\\\\');
                    execSync(`cmd.exe /c start "" "${escapedPath}"`);
                    console.log(`🌐 Opened report in Windows browser: ${winPath}`);
                } else {
                    const openCmd = process.platform === 'darwin' ? 'open' : (process.platform === 'win32' ? 'start' : 'xdg-open');
                    execSync(`${openCmd} "${reportPath}"`);
                    console.log(`🌐 Opened report: ${reportPath}`);
                }
            } catch (err) {
                console.warn(`⚠️ Failed to automatically open browser: ${err.message}`);
            }
        }
    });
}

main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
