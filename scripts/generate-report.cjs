const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function main() {
    let jobFilePath = "";
    const jobFileArg = process.argv[2];
    const reportDir = path.resolve(__dirname, '../temp/audio');

    if (!jobFileArg) {
        if (fs.existsSync(reportDir)) {
            const jobFiles = fs.readdirSync(reportDir)
                .filter(f => f.startsWith('tts-job-') && f.endsWith('.json'))
                .sort();
            if (jobFiles.length > 0) {
                const lastJobFile = jobFiles[jobFiles.length - 1];
                jobFilePath = path.join(reportDir, lastJobFile);
                console.log(`No job file specified. Loading latest: ${lastJobFile}`);
            } else {
                console.error("❌ No tts-job-*.json files found in temp/audio.");
                process.exit(1);
            }
        } else {
            console.error("❌ No temp/audio directory found.");
            process.exit(1);
        }
    } else {
        jobFilePath = path.resolve(jobFileArg);
        if (!fs.existsSync(jobFilePath) || !fs.statSync(jobFilePath).isFile()) {
            console.error(`❌ Job file not found: ${jobFilePath}`);
            process.exit(1);
        }
    }

    let jobState;
    try {
        jobState = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
    } catch (e) {
        console.error(`❌ Failed to parse job file: ${e.message}`);
        process.exit(1);
    }

    const bookName = jobState.bookName || "unknown";
    const items = jobState.items || [];
    const jobFileNameBase = path.basename(jobFilePath, '.json'); // e.g. tts-job-20260715-010000
    const reportPath = path.join(reportDir, `${jobFileNameBase.replace('tts-job-', 'tts-report-')}.html`);

    console.log(`Generating report for book: ${bookName}`);
    console.log(`Loaded ${items.length} items from job file.`);

    const esc = s => s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';

    // Helper to find actual folder path by batchId
    function findFolderByBatchId(batchId) {
        if (!batchId) return null;
        if (!fs.existsSync(reportDir)) return null;
        const dirs = fs.readdirSync(reportDir).filter(f => f.startsWith('batch-') && f.endsWith(`-${batchId}`));
        if (dirs.length > 0) {
            return dirs[0]; // e.g. batch-20260714-30011a04
        }
        return null;
    }

    let successCount = 0;
    let failCount = 0;
    let pendingCount = 0;

    const tableRows = items.map(({ text, done, batchId, hash }, idx) => {
        const folderName = findFolderByBatchId(batchId);
        const audioSrc = (hash && folderName) ? `${folderName}/${hash}.mp3` : '';
        
        let statusText = '';
        let statusClass = '';
        if (done === 1) {
            statusText = '✅ Success';
            statusClass = 'ok';
            successCount++;
        } else if (batchId) {
            statusText = '❌ Failed';
            statusClass = 'fail';
            failCount++;
        } else {
            statusText = '⏳ Pending';
            statusClass = 'pending';
            pendingCount++;
        }

        const audioCell = audioSrc
            ? `<audio controls preload="none"><source src="${esc(audioSrc)}" type="audio/mpeg"></audio>`
            : `<span class="na">—</span>`;

        // Calculate duration using ffprobe
        const audioPathOnDisk = (hash && folderName) ? path.join(reportDir, folderName, `${hash}.mp3`) : '';
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
      <td class="mono">${esc(batchId || '—')}</td>
      <td class="sentence">${esc(text)}</td>
      <td class="mono hash" title="${esc(hash || '')}">${hash ? hash.slice(0, 8) + '…' : '—'}</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td class="mono duration-cell${isTooDifferent ? ' bad-duration' : ''}">${durationStr}</td>
      <td class="audio-cell">${audioCell}</td>
    </tr>`;
    }).join('');

    const now = new Date();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TTS Report · ${esc(bookName)}</title>
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
      text-align: center;
    }
    .badge.ok      { background: #14532d; color: #86efac; }
    .badge.fail    { background: #450a0a; color: #fca5a5; }
    .badge.pending { background: #1e293b; color: #94a3b8; }
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
    <div class="meta-item"><strong>Report Generated:</strong> ${now.toISOString()}</div>
    <div class="meta-item"><strong>Total:</strong> ${items.length} sentences</div>
    <div class="meta-item"><strong>Success:</strong> ${successCount}</div>
    <div class="meta-item"><strong>Failed:</strong> ${failCount}</div>
    <div class="meta-item"><strong>Pending:</strong> ${pendingCount}</div>
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
  <footer>Generated by generate-report.cjs</footer>
</body>
</html>`;

    fs.writeFileSync(reportPath, html, 'utf8');
    console.log(`📄 Generation report saved: ${reportPath}`);

    try {
        // Check if running inside WSL
        const isWsl = fs.existsSync('/proc/version') && fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
        if (isWsl) {
            const winPath = execSync(`wslpath -w "${reportPath}"`, { encoding: 'utf8' }).trim();
            const escapedPath = winPath.replace(/\\/g, '\\\\');
            execSync(`cmd.exe /c start "" "${escapedPath}"`);
            console.log(`🌐 Opened report in Windows browser: ${winPath}`);
        } else {
            // Fallback for native Linux/macOS/Windows
            const openCmd = process.platform === 'darwin' ? 'open' : (process.platform === 'win32' ? 'start' : 'xdg-open');
            execSync(`${openCmd} "${reportPath}"`);
            console.log(`🌐 Opened report: ${reportPath}`);
        }
    } catch (err) {
        console.warn(`⚠️ Failed to automatically open browser: ${err.message}`);
    }
}

main();
