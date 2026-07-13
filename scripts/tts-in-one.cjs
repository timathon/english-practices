const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { getAudioBatch } = require('./tts-gen-cut-save-3.cjs');

// R2 Configuration
const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";

function getCleanText(text) {
    if (!text) return "";
    return text.trim();
}



function chunkTasksByWordCount(tasks, maxWords) {
    const chunks = [];
    let currentChunk = [];
    let currentWords = 0;
    
    for (const task of tasks) {
        const text = task.context_sentence || task.text || task.word || task.en || "";
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        if (currentChunk.length > 0 && currentWords + wordCount > maxWords) {
            chunks.push(currentChunk);
            currentChunk = [task];
            currentWords = wordCount;
        } else {
            currentChunk.push(task);
            currentWords += wordCount;
        }
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    return chunks;
}

// Traverse node tree recursively for Text Navigator or Writing Map
function extractTreeText(node, textsSet) {
    if (!node) return;
    if (node.text) {
        const txt = getCleanText(node.text);
        if (txt) textsSet.add(txt);
    }
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => extractTreeText(child, textsSet));
    }
}

async function checkAudioExists(text, bookName) {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const r2Key = `ep/${bookName}/${hash}.mp3`;
    try {
        await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key }));
        console.log(`Checking key: ${r2Key} for text: ${JSON.stringify(text)} -> EXISTS`);
        return { text, exists: true, hash, r2Key };
    } catch (e) {
        console.log(`Checking key: ${r2Key} for text: ${JSON.stringify(text)} -> MISSING (${e.name})`);
        return { text, exists: false, hash, r2Key };
    }
}

async function main() {
    const forceRegenerate = process.argv.includes('--regenerate');
    const noUpload = process.argv.includes('--no-upload');
    const useXl = process.argv.includes('--xl') || process.argv.includes('xl');
    const lastCheck = process.argv.includes('--last-check') || process.argv.includes('last-check');

    if (useXl) {
        if (process.env.GOOGLE_API_KEY_FREE) {
            process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY_FREE;
            console.log("🔑 Switched to GOOGLE_API_KEY_FREE");
        } else {
            console.warn("⚠️ Warning: GOOGLE_API_KEY_FREE is not set in environment!");
        }
    }

    let tasksToProcess = [];
    let bookName = "";
    let tongjiaMap = {};
    let processedViaLastCheck = false;

    if (lastCheck) {
        const reportDir = path.resolve(__dirname, '../temp/audio');
        if (fs.existsSync(reportDir)) {
            const missingFiles = fs.readdirSync(reportDir)
                .filter(f => f.startsWith('tts-missing-') && f.endsWith('.json'))
                .sort();
            if (missingFiles.length > 0) {
                const lastMissingFile = missingFiles[missingFiles.length - 1];
                const lastMissingPath = path.join(reportDir, lastMissingFile);
                console.log(`Using last missing list: ${lastMissingFile}`);
                try {
                    const content = JSON.parse(fs.readFileSync(lastMissingPath, 'utf8'));
                    bookName = content.bookName;
                    tongjiaMap = content.tongjiaMap || {};
                    tasksToProcess = content.missing || [];
                    processedViaLastCheck = true;
                    console.log(`Loaded ${tasksToProcess.length} missing items for category/book name: ${bookName}`);
                } catch (e) {
                    console.error(`⚠️ Failed to parse last missing list: ${e.message}`);
                }
            } else {
                console.log("No previous missing files found in temp/audio.");
            }
        }
    }

    if (!processedViaLastCheck) {
        const inputDir = process.argv[2];
        if (!inputDir) {
            console.error("Usage: node scripts/tts-in-one.cjs [unit_directory_path] [--regenerate] [--no-upload] [--xl] [--last-check]");
            process.exit(1);
        }

        const absoluteDir = path.resolve(inputDir);
        if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) {
            console.error(`❌ Directory not found: ${absoluteDir}`);
            process.exit(1);
        }

        // Determine bookName (e.g. raz-b) from the directory path relative to the data directory
        const relativeToData = path.relative(path.resolve(__dirname, '../data'), absoluteDir);
        bookName = relativeToData.split(path.sep)[0].toLowerCase();
        
        console.log(`Scanning unit directory: ${absoluteDir}`);
        console.log(`Resolved category/book name: ${bookName}`);

        const textsSet = new Set();
        const files = fs.readdirSync(absoluteDir);
        
        // Load tongjia mapping if it exists in this unit
        const tongjiaFile = files.find(f => f.endsWith('tongjia.cjs'));
        if (tongjiaFile) {
            const tongjiaPath = path.join(absoluteDir, tongjiaFile);
            try {
                tongjiaMap = require(tongjiaPath);
                console.log(`Loaded tongjia mapping from ${tongjiaFile}:`, tongjiaMap);
            } catch (e) {
                console.error(`⚠️ Failed to load tongjia mapping: ${e.message}`);
            }
        }
        
        for (const file of files) {
            if (!file.endsWith('.json') || file.includes('-recall-map') || file.includes('-writing-map') || file.includes('-grammar-wizard')) continue;
            const filePath = path.join(absoluteDir, file);
            console.log(`Reading file: ${file}`);
            
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (file.includes('-vocab-guide')) {
                    if (content.unit_vocabulary && Array.isArray(content.unit_vocabulary)) {
                        content.unit_vocabulary.forEach(item => {
                            if (item.context_sentence) textsSet.add(getCleanText(item.context_sentence));
                            if (item.word) textsSet.add(getCleanText(item.word));
                        });
                    }
                } else if (file.includes('-vocab-master')) {
                    if (content.challenges && Array.isArray(content.challenges)) {
                        content.challenges.forEach(challenge => {
                            if (challenge.questions && Array.isArray(challenge.questions)) {
                                challenge.questions.forEach(q => {
                                    if (q.context_sentence) textsSet.add(getCleanText(q.context_sentence));
                                });
                            }
                        });
                    }
                } else if (file.includes('-spelling-hero')) {
                    if (content.spelling_words && Array.isArray(content.spelling_words)) {
                        content.spelling_words.forEach(w => {
                            if (w.word) textsSet.add(getCleanText(w.word));
                        });
                    }
                } else if (file.includes('-sentence-architect')) {
                    if (content.challenges && Array.isArray(content.challenges)) {
                        content.challenges.forEach(challenge => {
                            const items = challenge.sentences || challenge.data || [];
                            items.forEach(item => {
                                if (item.en) textsSet.add(getCleanText(item.en));
                            });
                        });
                    }
                } else if (file.includes('-text-navigator') || file.includes('-writing-map')) {
                    if (content.sections && Array.isArray(content.sections)) {
                        content.sections.forEach(sec => {
                            if (sec.tree) extractTreeText(sec.tree, textsSet);
                        });
                    } else {
                        const treeData = content.tree || content;
                        extractTreeText(treeData, textsSet);
                    }
                } else if (file.includes('-passage-decoder-s')) {
                    if (content.sections && Array.isArray(content.sections)) {
                        content.sections.forEach(section => {
                            if (section.sentences && Array.isArray(section.sentences)) {
                                section.sentences.forEach(item => {
                                    if (item.en) textsSet.add(getCleanText(item.en));
                                });
                            }
                        });
                    }
                }
            } catch (e) {
                console.error(`❌ Failed to parse ${file}: ${e.message}`);
            }
        }

        console.log(`Found ${textsSet.size} unique texts requiring audio.`);

        if (textsSet.size === 0) {
            console.log("No texts found to process.");
            return;
        }

        if (forceRegenerate) {
            tasksToProcess = Array.from(textsSet).map(text => ({ context_sentence: text }));
            console.log(`--regenerate flag active. Processing all ${tasksToProcess.length} items...`);
        } else {
            console.log("Checking existing audios on R2...");
            const checkResults = [];
            const checkBatchSize = 10;
            const textsArray = Array.from(textsSet);
            for (let i = 0; i < textsArray.length; i += checkBatchSize) {
                const batch = textsArray.slice(i, i + checkBatchSize);
                const batchResults = await Promise.all(batch.map(text => checkAudioExists(text, bookName)));
                checkResults.push(...batchResults);
            }
            const missing = checkResults.filter(r => !r.exists);
            console.log(`Check complete: ${checkResults.length - missing.length} exist, ${missing.length} missing.`);
            
            tasksToProcess = missing.map(m => ({ context_sentence: m.text }));

            // Save list of missing items to temp/audio/tts-missing-[timestamp].json
            if (tasksToProcess.length > 0) {
                const now = new Date();
                const pad = n => String(n).padStart(2, '0');
                const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                const reportDir = path.resolve(__dirname, '../temp/audio');
                if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
                const missingFilePath = path.join(reportDir, `tts-missing-${ts}.json`);
                try {
                    fs.writeFileSync(missingFilePath, JSON.stringify({ bookName, tongjiaMap, missing: tasksToProcess }, null, 2), 'utf8');
                    console.log(`📄 Saved list of ${tasksToProcess.length} missing items to: ${missingFilePath}`);
                } catch (e) {
                    console.error(`⚠️ Failed to save missing items list: ${e.message}`);
                }
            }
        }
    }

    if (tasksToProcess.length === 0) {
        console.log("✨ All audios already exist. Nothing to generate.");
        return;
    }

    let chunks = [];
    if (useXl) {
        chunks = chunkTasksByWordCount(tasksToProcess, 300);
        console.log(`Generating audio in batches of max 300 words using GOOGLE_API_KEY_FREE...`);
    } else {
        for (let i = 0; i < tasksToProcess.length; i += 10) {
            chunks.push(tasksToProcess.slice(i, i + 10));
        }
        console.log(`Generating audio for ${tasksToProcess.length} items using getAudioBatch (in chunks of 10)...`);
    }
    
    const MIN_INTERVAL = 21000; // 21 seconds for < 3 RPM
    let lastRequestTime = 0;

    console.log(`Split tasks into ${chunks.length} batches.`);

    // Accumulate generation log across all batches
    const generationLog = []; // { batchId, text, hash, filename, status }[]

    const writeReport = () => {
        if (generationLog.length === 0) return;
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
            const audioCell = audioSrc
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
  <footer>Generated by tts-in-one.cjs &mdash; ${ts}</footer>
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
    };

    for (let i = 0; i < chunks.length; i++) {
        const batch = chunks[i];
        console.log(`\nProcessing batch ${i + 1}/${chunks.length} (${batch.length} items)...`);
        
        const now = Date.now();
        const timeSinceLast = now - lastRequestTime;
        if (i > 0 && timeSinceLast < MIN_INTERVAL) {
            const waitTime = MIN_INTERVAL - timeSinceLast;
            console.log(`Waiting ${waitTime / 1000}s to maintain RPM < 3...`);
            await new Promise(r => setTimeout(r, waitTime));
        }

        lastRequestTime = Date.now();
        const totalWords = batch.reduce((acc, item) => {
            const text = item.text || item.context_sentence || item.word || item.en || "";
            return acc + text.split(/\s+/).length;
        }, 0);
        const calculatedTimeout = Math.max(120000, totalWords * 1500);
        console.log(`⏱️  Setting timeout to ${calculatedTimeout / 1000}s based on word count (${totalWords} words).`);

        // Spelling Hero words should be treated identically, so we call getAudioBatch
        const result = await getAudioBatch(batch, bookName, { skipUpload: noUpload, tongjiaMap, timeout: calculatedTimeout });
        
        if (!result.success) {
            console.error(`❌ Batch ${i + 1} failed: ${result.reason}`);
            // Add failed batch items to log so they show as failed in the report
            for (const item of batch) {
                generationLog.push({
                    batchId: `Failed Batch ${i + 1}`,
                    text: item.context_sentence,
                    status: 2
                });
            }
            writeReport();
            process.exit(1);
        }
        
        if (result.quotaExhausted) {
            console.warn(`⚠️ Quota warning or limit hit in batch ${i + 1}.`);
        }

        // Collect per-file info from this batch
        if (result.files && result.batchId) {
            for (const f of result.files) {
                generationLog.push({ batchId: result.batchId, folderName: result.folderName, text: f.text, hash: f.hash, filename: f.filename, status: f.status });
            }
        }
    }
    
    console.log(`\n✅ Successfully generated${noUpload ? ' (local only, no R2 upload)' : ' and uploaded'} all missing audios!`);
    writeReport();
}

main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
