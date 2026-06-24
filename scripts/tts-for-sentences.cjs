const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getAudioBatch } = require('./tts-gen-cut-save-3.cjs');

/**
 * tts-for-sentences.cjs
 * 
 * Usage:
 *   node scripts/tts-for-sentences.cjs [book_name] [sentences_file_or_string] [--no-upload] [--regenerate]
 * 
 * Example:
 *   node scripts/tts-for-sentences.cjs a3b "Hello world.\nThis is a test."
 *   node scripts/tts-for-sentences.cjs a3b temp/my-sentences.txt
 */

async function main() {
    const bookName = process.argv[2];
    const input = process.argv[3];

    if (!bookName || !input) {
        console.error("Usage: node scripts/tts-for-sentences.cjs [book_name] [sentences_file_or_string] [--no-upload] [--regenerate]");
        process.exit(1);
    }

    let sentences = [];
    if (fs.existsSync(input)) {
        sentences = fs.readFileSync(input, 'utf8')
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    } else {
        sentences = input.split('\\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    if (sentences.length === 0) {
        console.error("No sentences found to process.");
        process.exit(1);
    }

    const noUpload = process.argv.includes('--no-upload');
    const forceRegenerate = process.argv.includes('--regenerate');

    console.log(`Book Name: ${bookName}`);
    console.log(`Total sentences: ${sentences.length}`);
    console.log(`Upload to R2: ${noUpload ? 'No' : 'Yes'}`);

    const tasks = sentences.map(text => ({ text }));

    // Accumulate generation log for report
    const generationLog = [];

    // Processing in chunks of 8 as per tts-in-one.cjs convention
    const CHUNK_SIZE = 8;
    const MIN_INTERVAL = 21000; // 21 seconds for < 3 RPM
    let lastRequestTime = 0;

    for (let i = 0; i < tasks.length; i += CHUNK_SIZE) {
        const chunk = tasks.slice(i, i + CHUNK_SIZE);
        console.log(`\nProcessing batch ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(tasks.length / CHUNK_SIZE)} (${chunk.length} items)...`);

        const now = Date.now();
        const timeSinceLast = now - lastRequestTime;
        if (i > 0 && timeSinceLast < MIN_INTERVAL) {
            const waitTime = MIN_INTERVAL - timeSinceLast;
            console.log(`Waiting ${waitTime / 1000}s to maintain RPM < 3...`);
            await new Promise(r => setTimeout(r, waitTime));
        }

        lastRequestTime = Date.now();
        const result = await getAudioBatch(chunk, bookName, { skipUpload: noUpload });

        if (!result.success) {
            console.error(`❌ Batch failed: ${result.reason}`);
            process.exit(1);
        }

        if (result.files && result.batchId) {
            result.files.forEach(f => {
                console.log(`  [${f.status === 1 ? 'OK' : 'FAIL'}] ${f.text} -> ${f.hash}.mp3`);
                generationLog.push({ ...f, batchId: result.batchId, folderName: result.folderName });
            });
        }
    }

    console.log("\n✅ TTS generation complete.");

    // Write timestamped HTML generation report
    if (generationLog.length > 0) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const reportDir = path.resolve(__dirname, '../temp/audio');
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
        const reportPath = path.join(reportDir, `tts-report-${ts}.html`);

        const failCount = generationLog.filter(e => e.status === 2).length;
        const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const tableRows = generationLog.map(({ batchId, folderName, text, hash, status }, idx) => {
            const dirName = folderName || `batch_${batchId}`;
            const audioSrc = hash ? `${dirName}/${hash}.mp3` : '';
            const statusCell = status === 1
                ? `<span class="badge ok">✅ 1</span>`
                : `<span class="badge fail">❌ 2</span>`;
            const audioCell = audioSrc && fs.existsSync(path.join(reportDir, audioSrc))
                ? `<audio controls preload="none"><source src="${esc(audioSrc)}" type="audio/mpeg"></audio>`
                : `<span class="na">—</span>`;

            // Calculate duration using ffprobe
            const audioPathOnDisk = hash ? path.join(reportDir, dirName, `${hash}.mp3`) : '';
            let durationStr = '—';
            let isTooDifferent = false;
            if (audioPathOnDisk && fs.existsSync(audioPathOnDisk)) {
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
  <title>TTS Report · ${esc(bookName)} · ${ts}</title>
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
  <h1>🎙️ TTS Generation Report</h1>
  <div class="meta">
    <div class="meta-item"><strong>Book:</strong> ${esc(bookName)}</div>
    <div class="meta-item"><strong>Generated:</strong> ${now.toISOString()}</div>
    <div class="meta-item"><strong>Total:</strong> ${generationLog.length} sentences</div>
    <div class="meta-item"><strong>Upload to R2:</strong> ${noUpload ? 'No (--no-upload)' : 'Yes'}</div>
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
  <footer>Generated by tts-for-sentences.cjs &mdash; ${ts}</footer>
</body>
</html>`;

        fs.writeFileSync(reportPath, html, 'utf8');
        console.log(`📄 Generation report saved: ${reportPath}`);
    }
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
