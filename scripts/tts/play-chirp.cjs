/**
 * play-chirp.cjs (scripts/tts/play-chirp.cjs)
 * 
 * Spins up a web server to display an interactive audio player page for Chirp 3 generated TTS audio.
 * Allows filtering by multiple voices, text search, and direct MP3 playback.
 * 
 * Usage:
 *   node scripts/tts/play-chirp.cjs [path_to_chirp_json] [--port <port>]
 * 
 * Examples:
 *   node scripts/tts/play-chirp.cjs
 *   node scripts/tts/play-chirp.cjs temp/audio/chirp-20260813-010404.json
 *   node scripts/tts/play-chirp.cjs --port 3333
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { runTtsSynthesis } = require('./tts-chirp.cjs');

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

function getLatestChirpJson(dirPath) {
    if (!fs.existsSync(dirPath)) return null;
    const files = fs.readdirSync(dirPath)
        .filter(f => f.startsWith('chirp-') && f.endsWith('.json'))
        .sort();
    if (files.length === 0) return null;
    return path.join(dirPath, files[files.length - 1]);
}

function main() {
    const args = process.argv.slice(2);
    let port = 3300;
    const portIdx = args.indexOf('--port');
    if (portIdx !== -1 && args[portIdx + 1]) {
        port = parseInt(args[portIdx + 1], 10);
    }

    const audioDir = path.resolve(__dirname, '../../temp/audio');
    let jsonPath = args.find(a => !a.startsWith('--') && (args[args.indexOf(a) - 1] !== '--port'));

    if (jsonPath) {
        jsonPath = path.resolve(jsonPath);
    } else {
        jsonPath = getLatestChirpJson(audioDir);
    }

    if (!jsonPath || !fs.existsSync(jsonPath)) {
        console.error(`❌ Error: No valid chirp JSON file found at ${jsonPath || audioDir}`);
        process.exit(1);
    }

    console.log(`📄 Loading Chirp Job JSON: ${jsonPath}`);
    let jobData;
    try {
        jobData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
        console.error(`❌ Failed to parse JSON file: ${e.message}`);
        process.exit(1);
    }

    const server = http.createServer((req, res) => {
        const reqUrl = req.url.split('?')[0];

        // Serve local MP3 files
        if (reqUrl.startsWith('/audio/')) {
            const relativeAudioPath = decodeURIComponent(reqUrl.replace('/audio/', ''));
            const fullAudioPath = path.join(audioDir, relativeAudioPath);
            if (fs.existsSync(fullAudioPath)) {
                res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
                return fs.createReadStream(fullAudioPath).pipe(res);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                return res.end('Audio file not found');
            }
        }

        // API Endpoint: Regenerate selected items
        if (req.method === 'POST' && reqUrl === '/api/regenerate') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const { hashes, voice } = JSON.parse(body || '{}');
                    if (!hashes || !Array.isArray(hashes) || hashes.length === 0) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'No hashes specified' }));
                    }

                    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15);
                    const regenBatchId = `batch-${timestamp}`;

                    // 1. Read existing job JSON
                    let currentJob = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                    const targetHashSet = new Set(hashes);

                    // 2. Reset selected items to initial state & assign regenbatch (voice = "" so it rotates)
                    currentJob.items.forEach(item => {
                        if (targetHashSet.has(item.hash)) {
                            item["tts-done"] = 0;
                            item["voice"] = "";
                            item["regenbatch"] = regenBatchId;
                        }
                    });

                    // Save updated job JSON before running synthesis
                    fs.writeFileSync(jsonPath, JSON.stringify(currentJob, null, 2), 'utf8');

                    console.log(`\n🚀 Reset ${hashes.length} item(s) to tts-done=0 (regenbatch: ${regenBatchId}). Executing synthesis module directly...`);

                    (async () => {
                        try {
                            await runTtsSynthesis({
                                targetPath: jsonPath,
                                explicitVoice: null,
                                targetHashes: targetHashSet
                            });

                            // Reload updated jobData
                            try {
                                jobData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                            } catch (e) {}

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, count: hashes.length, regenbatch: regenBatchId }));
                        } catch (err) {
                            console.error(`❌ Regeneration failed: ${err.message}`);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: err.message }));
                        }
                    })();
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }

        // API Endpoint: Upload selected MP3s to Cloudflare R2
        if (req.method === 'POST' && reqUrl === '/api/upload') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { hashes } = JSON.parse(body || '{}');
                    let currentJob = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                    const bookName = currentJob.bookName || 'a8a';
                    const targetSet = hashes && Array.isArray(hashes) && hashes.length > 0 ? new Set(hashes) : null;

                    const itemsToUpload = currentJob.items.filter(item => {
                        if (item["tts-done"] !== 1 || !item.mp3 || !fs.existsSync(item.mp3)) return false;
                        if (targetSet) return targetSet.has(item.hash);
                        return item["upload-done"] !== 1;
                    });

                    if (itemsToUpload.length === 0) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ success: true, message: 'No MP3 files to upload', count: 0 }));
                    }

                    console.log(`\n☁️ Uploading ${itemsToUpload.length} file(s) to R2 bucket [${BUCKET_NAME}] in batches of 5...`);
                    let uploadedCount = 0;
                    const BATCH_SIZE = 5;

                    for (let i = 0; i < itemsToUpload.length; i += BATCH_SIZE) {
                        const batch = itemsToUpload.slice(i, i + BATCH_SIZE);
                        await Promise.all(batch.map(async (item) => {
                            const r2Key = `ep/${bookName}/${item.hash}.mp3`;
                            try {
                                await s3Client.send(new PutObjectCommand({
                                    Bucket: BUCKET_NAME,
                                    Key: r2Key,
                                    Body: fs.readFileSync(item.mp3),
                                    ContentType: 'audio/mpeg'
                                }));
                                uploadedCount++;
                                item["upload-done"] = 1;
                                console.log(`✅ Uploaded [${uploadedCount}/${itemsToUpload.length}]: ${r2Key}`);
                            } catch (uploadErr) {
                                console.error(`❌ Failed to upload ${r2Key}: ${uploadErr.message}`);
                            }
                        }));
                    }

                    fs.writeFileSync(jsonPath, JSON.stringify(currentJob, null, 2), 'utf8');
                    try {
                        jobData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                    } catch (e) {}

                    console.log(`\n🎉 Upload completed! Successfully uploaded ${uploadedCount} file(s) to R2 bucket [${BUCKET_NAME}].\n`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, count: uploadedCount, message: `Successfully uploaded ${uploadedCount} file(s) to R2.` }));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }

        // Serve HTML Interface
        try {
            jobData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        } catch (e) {}
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(generateHtmlPage(jobData, path.basename(jsonPath)));
    });

    server.listen(port, () => {
        const url = `http://localhost:${port}`;
        console.log(`\n=================================================`);
        console.log(`🎵 Chirp 3 Audio Showcase Server Running!`);
        console.log(`🔗 Local URL: ${url}`);
        console.log(`📁 File     : ${path.basename(jsonPath)}`);
        console.log(`=================================================\n`);
    });
}

function generateHtmlPage(jobData, jsonFileName) {
    const items = jobData.items || [];
    const voicesSet = new Set();
    const regenBatchesSet = new Set();
    items.forEach(i => {
        if (i.voice) voicesSet.add(i.voice);
        const batchTag = i.regenbatch || 'batch-initial';
        regenBatchesSet.add(batchTag);
    });
    const sortedVoices = Array.from(voicesSet).sort();
    const sortedRegenBatches = Array.from(regenBatchesSet).sort();

    // Distinct HSL Palette Generator for Batches
    const batchColorMap = {};
    sortedRegenBatches.forEach((batch, idx) => {
        if (batch === 'batch-initial') {
            batchColorMap[batch] = {
                bg: 'rgba(56, 189, 248, 0.15)',
                border: 'rgba(56, 189, 248, 0.35)',
                text: '#38bdf8'
            };
        } else if (batch === 'batch-r2-existing') {
            batchColorMap[batch] = {
                bg: 'rgba(168, 85, 247, 0.15)',
                border: 'rgba(168, 85, 247, 0.35)',
                text: '#c084fc'
            };
        } else {
            // Distribute hues across HSL wheel for distinct colors
            const hue = (idx * 137.5 + 45) % 360; // Golden ratio angle distribution
            batchColorMap[batch] = {
                bg: `hsla(${hue}, 85%, 60%, 0.15)`,
                border: `hsla(${hue}, 85%, 60%, 0.35)`,
                text: `hsl(${hue}, 90%, 70%)`
            };
        }
    });

    // Map mp3 local absolute paths to relative /audio/ endpoint
    const processedItems = items.map(i => {
        let relativeMp3 = '';
        if (i.mp3) {
            const parts = i.mp3.split('/temp/audio/');
            if (parts.length > 1) {
                relativeMp3 = '/audio/' + parts[1];
            } else {
                relativeMp3 = '/audio/' + path.basename(path.dirname(i.mp3)) + '/' + path.basename(i.mp3);
            }
        } else if (i.r2Url) {
            relativeMp3 = i.r2Url;
        }
        return {
            text: i.text,
            voice: i.voice || 'Unknown',
            hash: i.hash,
            mp3Url: relativeMp3,
            ttsDone: i["tts-done"] || 0,
            uploadDone: i["upload-done"] || 0,
            regenbatch: i.regenbatch || 'batch-initial'
        };
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chirp 3 Audio Showcase - ${jobData.bookName || 'Practices'}</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --card-border: #334155;
            --primary: #38bdf8;
            --primary-hover: #0284c7;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent-green: #4ade80;
            --accent-purple: #c084fc;
            --accent-amber: #fbbf24;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: var(--bg-color);
            color: var(--text-main);
            padding: 20px;
            min-height: 100vh;
        }

        .header {
            max-width: 1200px;
            margin: 0 auto 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--card-border);
        }

        .title-area h1 {
            font-size: 24px;
            background: linear-gradient(to right, #38bdf8, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;

        }
        .title-area p {
            color: var(--text-muted);
            font-size: 13px;
            margin-top: 4px;
        }

        .stats-badge {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            color: var(--primary);
        }

        .filter-section {
            max-width: 1200px;
            margin: 0 auto 25px;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            padding: 16px;
            border-radius: 12px;
        }

        .search-box {
            width: 100%;
            padding: 10px 14px;
            border-radius: 8px;
            border: 1px solid var(--card-border);
            background: #0f172a;
            color: var(--text-main);
            font-size: 14px;
            margin-bottom: 15px;
            outline: none;
        }
        .search-box:focus { border-color: var(--primary); }

        .voice-filter-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-muted);
        }
        .voice-actions button {
            background: none;
            border: none;
            color: var(--primary);
            cursor: pointer;
            font-size: 12px;
            margin-left: 10px;
        }
        .voice-actions button:hover { text-decoration: underline; }

        .voice-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            max-height: 140px;
            overflow-y: auto;
            padding-right: 5px;
            margin-bottom: 15px;
        }

        .voice-chip {
            background: #0f172a;
            border: 1px solid var(--card-border);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .voice-chip input { display: none; }
        .voice-chip.active {
            background: rgba(56, 189, 248, 0.15);
            border-color: var(--primary);
            color: var(--primary);
            font-weight: 600;
        }
        .voice-chip.active-amber {
            background: rgba(251, 191, 36, 0.15);
            border-color: var(--accent-amber);
            color: var(--accent-amber);
            font-weight: 600;
        }

        .grid {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 16px;
        }

        .item-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.2s ease, border-color 0.2s ease;
            position: relative;
        }
        .item-card.selected {
            border-color: var(--primary);
            background: #1e293b;
            box-shadow: 0 0 0 1px var(--primary);
        }
        .item-card:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
        }

        .card-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .card-select-label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }
        .card-checkbox {
            width: 16px;
            height: 16px;
            cursor: pointer;
            accent-color: var(--primary);
        }

        .voice-tag {
            background: rgba(192, 132, 252, 0.15);
            color: var(--accent-purple);
            border: 1px solid rgba(192, 132, 252, 0.3);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .regen-tag {
            background: rgba(251, 191, 36, 0.15);
            color: var(--accent-amber);
            border: 1px solid rgba(251, 191, 36, 0.3);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
        }

        .text-content {
            font-size: 15px;
            line-height: 1.4;
            color: var(--text-main);
            margin-bottom: 14px;
        }

        audio {
            width: 100%;
            height: 36px;
            border-radius: 6px;
            outline: none;
        }

        .floating-action-bar {
            position: fixed;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%);
            background: #1e293b;
            border: 1px solid var(--primary);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            padding: 12px 24px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 100;
        }
        .floating-action-bar select {
            background: #0f172a;
            color: #fff;
            border: 1px solid var(--card-border);
            padding: 6px 12px;
            border-radius: 8px;
            outline: none;
            font-size: 13px;
        }
        .btn-regen {
            background: linear-gradient(135deg, #38bdf8, #0284c7);
            color: #fff;
            border: none;
            padding: 8px 18px;
            border-radius: 20px;
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
        }
        .btn-regen:hover { opacity: 0.9; transform: scale(1.03); }
        .upload-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(4px);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .upload-modal-content {
            background: #1e293b;
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 24px;
            width: 380px;
            max-width: 90vw;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
            text-align: center;
        }
        .upload-modal-content h3 {
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 18px;
            color: var(--text-main);
        }
        .upload-modal-content p {
            font-size: 14px;
            color: var(--text-muted);
            margin-bottom: 20px;
            line-height: 1.4;
        }
        .upload-modal-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .upload-modal-btn {
            padding: 10px 16px;
            border-radius: 10px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        .btn-upload-selected {
            background: linear-gradient(135deg, #c084fc, #9333ea);
            color: #fff;
        }
        .btn-upload-selected:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .btn-upload-all {
            background: #334155;
            color: #f8fafc;
        }
        .btn-upload-all:hover {
            background: #475569;
        }
        .btn-upload-cancel {
            background: transparent;
            color: var(--text-muted);
            margin-top: 6px;
            font-size: 13px;
        }
        .btn-upload-cancel:hover {
            color: #fff;
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="title-area">
            <h1>🎙️ Chirp 3 Voice Showcase</h1>
            <p>File: ${jsonFileName} | Book: <strong>${jobData.bookName || 'N/A'}</strong></p>
        </div>
        <div class="stats-badge" id="visibleStats">
            Showing ${processedItems.length} of ${processedItems.length} items
        </div>
    </div>

    <div class="filter-section">
        <input type="text" id="searchInput" class="search-box" placeholder="🔎 Search text content..." oninput="filterItems()">

        <div class="voice-filter-header">
            <span>Filter Voices (<span id="selectedVoiceCount">${sortedVoices.length}</span> selected)</span>
            <div class="voice-actions">
                <button onclick="selectAllVoices(true)">Select All Voices</button>
                <button onclick="selectAllVoices(false)">Deselect All Voices</button>
                <span style="color:#334155;">|</span>
                <button onclick="toggleSelectAllVisible(true)">Select All Visible Items</button>
                <button onclick="toggleSelectAllVisible(false)">Deselect Visible Items</button>
            </div>
        </div>

        <div class="voice-chips" id="voiceChipsContainer">
            ${sortedVoices.map(voice => `
                <label class="voice-chip active" id="chip-${voice}">
                    <input type="checkbox" value="${voice}" checked onchange="toggleVoiceChip('${voice}')">
                    🗣️ ${voice}
                </label>
            `).join('')}
        </div>

        ${sortedRegenBatches.length > 0 ? `
            <div class="voice-filter-header" style="margin-top: 10px;">
                <span>Filter Regen Batches (<span id="selectedRegenCount">${sortedRegenBatches.length}</span> selected)</span>
                <div class="voice-actions">
                    <button onclick="selectAllRegenBatches(true)">Select All Batches</button>
                    <button onclick="selectAllRegenBatches(false)">Deselect All Batches</button>
                </div>
            </div>
            <div class="voice-chips" id="regenChipsContainer">
                ${sortedRegenBatches.map(batch => {
                    const c = batchColorMap[batch] || { bg: '#1e293b', border: '#334155', text: '#fbbf24' };
                    return `
                    <label class="voice-chip active-batch" id="regen-chip-${batch}" data-bg="${c.bg}" data-border="${c.border}" data-text="${c.text}" style="background: ${c.bg}; border-color: ${c.border}; color: ${c.text}; font-weight: 600;">
                        <input type="checkbox" value="${batch}" checked onchange="toggleRegenChip('${batch}')">
                        ⚡ ${batch}
                    </label>
                    `;
                }).join('')}
            </div>
        ` : ''}
    </div>

    <div class="grid" id="itemsGrid">
        ${processedItems.map((item, idx) => {
            const safeTextAttr = item.text.toLowerCase().replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const batchStyle = batchColorMap[item.regenbatch] ? `background: ${batchColorMap[item.regenbatch].bg}; border-color: ${batchColorMap[item.regenbatch].border}; color: ${batchColorMap[item.regenbatch].text};` : '';
            return `
            <div class="item-card" id="card-${item.hash}" data-hash="${item.hash}" data-voice="${item.voice}" data-regenbatch="${item.regenbatch || ''}" data-text="${safeTextAttr}" onclick="handleCardClick(event, '${item.hash}')">
                <div>
                    <div class="card-meta">
                        <label class="card-select-label" onclick="event.stopPropagation()">
                            <input type="checkbox" class="card-checkbox" value="${item.hash}" onchange="toggleCardSelection('${item.hash}', this.checked)">
                            <span class="voice-tag">🗣️ ${item.voice}</span>
                            ${item.regenbatch ? `<span class="regen-tag" style="${batchStyle}">⚡ ${item.regenbatch}</span>` : ''}
                        </label>
                        <span style="font-size:11px; color:var(--text-muted);">#${idx + 1}</span>
                    </div>
                    <div class="text-content">"${escapeHtml(item.text)}"</div>
                </div>
                ${item.mp3Url ? `
                    <div onclick="event.stopPropagation()">
                        <audio controls preload="none">
                            <source src="${item.mp3Url}" type="audio/mpeg">
                            Your browser does not support audio playback.
                        </audio>
                    </div>
                ` : `<div style="color:red; font-size:12px;">MP3 Not Available</div>`}
            </div>
            `;
        }).join('')}
    </div>

    <div class="floating-action-bar" id="floatingBar">
        <span style="font-size:13px; font-weight:600;"><span id="checkedCount">0</span> items selected</span>
        <button class="btn-regen" id="btnRegenerate" disabled onclick="triggerRegenerate()">⚡ Regenerate Selected</button>
        <button class="btn-regen" id="btnUpload" style="background: linear-gradient(135deg, #c084fc, #9333ea);" onclick="triggerUpload()">☁️ Upload to R2</button>
    </div>

    <!-- Upload Options Modal -->
    <div class="upload-modal-overlay" id="uploadModal">
        <div class="upload-modal-content">
            <h3>☁️ Upload to Cloudflare R2</h3>
            <p id="uploadModalDesc">Choose how you want to upload generated MP3s for this job.</p>
            <div class="upload-modal-buttons">
                <button class="upload-modal-btn btn-upload-selected" id="modalBtnUploadSelected" onclick="executeUpload('selected')">
                    Upload Selected (<span id="modalSelectedCount">0</span>)
                </button>
                <button class="upload-modal-btn btn-upload-all" onclick="executeUpload('all')">
                    Upload All Generated (${processedItems.length})
                </button>
                <button class="upload-modal-btn btn-upload-cancel" onclick="closeUploadModal()">
                    Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- Upload Result Modal -->
    <div class="upload-modal-overlay" id="uploadResultModal">
        <div class="upload-modal-content" style="text-align: center;">
            <h3 style="color: #22c55e;">🎉 Upload Complete!</h3>
            <p id="uploadResultMsg" style="font-size: 15px; margin: 16px 0; color: #e2e8f0;"></p>
            <div class="upload-modal-buttons" style="justify-content: center;">
                <button class="upload-modal-btn btn-upload-all" style="padding: 10px 28px;" onclick="closeUploadResultModal()">OK</button>
            </div>
        </div>
    </div>

    <script>
        const allItems = ${JSON.stringify(processedItems)};
        const selectedVoices = new Set(${JSON.stringify(sortedVoices)});
        const selectedRegenBatches = new Set(${JSON.stringify(sortedRegenBatches)});
        const checkedHashes = new Set();

        window.handleCardClick = function(event, hash) {
            const card = document.getElementById('card-' + hash);
            if (!card) return;
            const checkbox = card.querySelector('.card-checkbox');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                window.toggleCardSelection(hash, checkbox.checked);
            }
        };

        window.toggleCardSelection = function(hash, isChecked) {
            const card = document.getElementById('card-' + hash);
            if (!card) return;
            const checkbox = card.querySelector('.card-checkbox');
            
            if (typeof isChecked === 'undefined') {
                isChecked = checkbox ? checkbox.checked : false;
            } else if (checkbox) {
                checkbox.checked = isChecked;
            }

            if (isChecked) {
                checkedHashes.add(hash);
                card.classList.add('selected');
            } else {
                checkedHashes.delete(hash);
                card.classList.remove('selected');
            }
            window.updateActionButtons();
        };

        window.toggleSelectAllVisible = function(select) {
            const cards = document.querySelectorAll('.item-card');
            cards.forEach(card => {
                if (card.style.display !== 'none') {
                    const hash = card.getAttribute('data-hash');
                    window.toggleCardSelection(hash, select);
                }
            });
            window.updateActionButtons();
        };

        window.updateActionButtons = function() {
            const btnRegen = document.getElementById('btnRegenerate');
            const countEl = document.getElementById('checkedCount');
            if (countEl) countEl.textContent = checkedHashes.size;
            if (btnRegen) btnRegen.disabled = checkedHashes.size === 0;

            const modalSelectedBtn = document.getElementById('modalBtnUploadSelected');
            const modalCountEl = document.getElementById('modalSelectedCount');
            if (modalCountEl) modalCountEl.textContent = checkedHashes.size;
            if (modalSelectedBtn) modalSelectedBtn.disabled = checkedHashes.size === 0;
        };

        window.triggerUpload = function() {
            window.updateActionButtons();
            const modal = document.getElementById('uploadModal');
            if (modal) modal.style.display = 'flex';
        };

        window.closeUploadModal = function() {
            const modal = document.getElementById('uploadModal');
            if (modal) modal.style.display = 'none';
        };

        window.executeUpload = async function(type) {
            let targetHashes = [];
            if (type === 'selected') {
                if (checkedHashes.size === 0) return;
                targetHashes = Array.from(checkedHashes);
            }

            window.closeUploadModal();

            const btn = document.getElementById('btnUpload');
            if (!btn) return;
            btn.disabled = true;
            btn.textContent = '⏳ Uploading to R2...';

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hashes: targetHashes })
                });
                const data = await res.json();
                if (data.success) {
                    const completionMsg = "🎉 Upload completed! Successfully uploaded " + data.count + " MP3 file(s) to Cloudflare R2.";
                    console.log(completionMsg);
                    btn.textContent = "✅ Uploaded " + data.count + " items!";
                    showUploadResultModal(completionMsg);
                } else {
                    const errorMsg = '❌ Upload failed: ' + (data.error || 'Unknown error');
                    console.error(errorMsg);
                    alert(errorMsg);
                    btn.disabled = false;
                    btn.textContent = '☁️ Upload to R2';
                }
            } catch (err) {
                const errorMsg = '❌ Error sending upload request: ' + err.message;
                console.error(errorMsg);
                alert(errorMsg);
                btn.disabled = false;
                btn.textContent = '☁️ Upload to R2';
            }
        };

        window.showUploadResultModal = function(msg) {
            const resultMsg = document.getElementById('uploadResultMsg');
            const resultModal = document.getElementById('uploadResultModal');
            if (resultMsg) resultMsg.textContent = msg;
            if (resultModal) resultModal.style.display = 'flex';
        };

        window.closeUploadResultModal = function() {
            const resultModal = document.getElementById('uploadResultModal');
            if (resultModal) resultModal.style.display = 'none';
            window.location.reload();
        };

        window.triggerRegenerate = async function() {
            if (checkedHashes.size === 0) return;
            const hashes = Array.from(checkedHashes);
            const btn = document.getElementById('btnRegenerate');

            btn.disabled = true;
            btn.textContent = '⏳ Resetting & Regenerating...';

            try {
                const res = await fetch('/api/regenerate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hashes })
                });
                const data = await res.json();
                if (data.success) {
                    btn.textContent = '✅ Done! Reloading...';
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    alert('❌ Regeneration failed: ' + (data.error || 'Unknown error'));
                    btn.disabled = false;
                    btn.textContent = '⚡ Regenerate Selected';
                }
            } catch (err) {
                alert('❌ Error sending request: ' + err.message);
                btn.disabled = false;
                btn.textContent = '⚡ Regenerate Selected';
            }
        };

        window.toggleVoiceChip = function(voice) {
            const chip = document.getElementById('chip-' + voice);
            const checkbox = chip.querySelector('input');
            if (checkbox.checked) {
                selectedVoices.add(voice);
                chip.classList.add('active');
            } else {
                selectedVoices.delete(voice);
                chip.classList.remove('active');
            }
            document.getElementById('selectedVoiceCount').textContent = selectedVoices.size;
            window.filterItems();
        };

        window.selectAllVoices = function(select) {
            const container = document.getElementById('voiceChipsContainer');
            if (!container) return;
            const chips = container.querySelectorAll('.voice-chip');
            chips.forEach(chip => {
                const checkbox = chip.querySelector('input');
                checkbox.checked = select;
                const voice = checkbox.value;
                if (select) {
                    selectedVoices.add(voice);
                    chip.classList.add('active');
                } else {
                    selectedVoices.delete(voice);
                    chip.classList.remove('active');
                }
            });
            document.getElementById('selectedVoiceCount').textContent = selectedVoices.size;
            window.filterItems();
        };

        window.toggleRegenChip = function(batch) {
            const chip = document.getElementById('regen-chip-' + batch);
            if (!chip) return;
            const checkbox = chip.querySelector('input');
            const bg = chip.getAttribute('data-bg');
            const border = chip.getAttribute('data-border');
            const text = chip.getAttribute('data-text');

            if (checkbox.checked) {
                selectedRegenBatches.add(batch);
                chip.style.opacity = '1';
                chip.style.background = bg;
                chip.style.borderColor = border;
                chip.style.color = text;
            } else {
                selectedRegenBatches.delete(batch);
                chip.style.opacity = '0.35';
                chip.style.background = '#0f172a';
                chip.style.borderColor = '#334155';
                chip.style.color = '#94a3b8';
            }
            const el = document.getElementById('selectedRegenCount');
            if (el) el.textContent = selectedRegenBatches.size;
            window.filterItems();
        };

        window.selectAllRegenBatches = function(select) {
            const container = document.getElementById('regenChipsContainer');
            if (!container) return;
            const chips = container.querySelectorAll('.voice-chip');
            chips.forEach(chip => {
                const checkbox = chip.querySelector('input');
                checkbox.checked = select;
                const batch = checkbox.value;
                const bg = chip.getAttribute('data-bg');
                const border = chip.getAttribute('data-border');
                const text = chip.getAttribute('data-text');

                if (select) {
                    selectedRegenBatches.add(batch);
                    chip.style.opacity = '1';
                    chip.style.background = bg;
                    chip.style.borderColor = border;
                    chip.style.color = text;
                } else {
                    selectedRegenBatches.delete(batch);
                    chip.style.opacity = '0.35';
                    chip.style.background = '#0f172a';
                    chip.style.borderColor = '#334155';
                    chip.style.color = '#94a3b8';
                }
            });
            const el = document.getElementById('selectedRegenCount');
            if (el) el.textContent = selectedRegenBatches.size;
            window.filterItems();
        };

        window.filterItems = function() {
            const query = document.getElementById('searchInput').value.toLowerCase().trim();
            const cards = document.querySelectorAll('.item-card');
            let visibleCount = 0;

            cards.forEach(card => {
                const voice = card.getAttribute('data-voice');
                const regenbatch = card.getAttribute('data-regenbatch');
                const text = card.getAttribute('data-text');

                const voiceMatch = selectedVoices.has(voice);
                const regenMatch = selectedRegenBatches.size === 0 || selectedRegenBatches.has(regenbatch);
                const textMatch = !query || text.includes(query);

                if (voiceMatch && regenMatch && textMatch) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            document.getElementById('visibleStats').textContent = 'Showing ' + visibleCount + ' of ' + allItems.length + ' items';
        };
    </script>
</body>
</html>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

main();
