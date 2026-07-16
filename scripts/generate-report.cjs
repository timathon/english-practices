const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";

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
                jobFilePath = path.join(reportDir, jobFiles[jobFiles.length - 1]);
                console.log(`No job file specified. Loading latest: ${jobFiles[jobFiles.length - 1]}`);
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
    }

    if (!fs.existsSync(jobFilePath)) {
        console.error(`❌ Job file not found: ${jobFilePath}`);
        process.exit(1);
    }

    const PORT = 3013;
    const server = http.createServer(async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

        const url = new URL(req.url, `http://localhost:${PORT}`);
        if (url.pathname === '/') {
            let jobState = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
            const jobFileNameBase = path.basename(jobFilePath, '.json');
            const dateStr = jobFileNameBase.split('-')[2]; // e.g., "20260715"
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(getHtml(jobState, dateStr));
        } else if (url.pathname === '/api/recut' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { text, hash, batchId, start, end, wav } = data;
                    if (!hash || !batchId || start === undefined || end === undefined || !wav) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ success: false, error: "Missing fields" }));
                        return;
                    }

                    const bookName = JSON.parse(fs.readFileSync(jobFilePath, 'utf8')).bookName || "unknown";
                    const r2Key = `ep/${bookName}/${hash}.mp3`;
                    
                    const batchFolder = path.dirname(wav);
                    const segmentMp3 = path.join(batchFolder, `${hash}.mp3`);

                    const cmd = `ffmpeg -i "${wav}" -ss ${start} -to ${end} -c:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`;
                    console.log(`Re-cutting segment: ${cmd}`);
                    execSync(cmd);

                    // Update job file
                    let jobState = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
                    const item = jobState.items.find(i => i.hash === hash && i.batchId === batchId);
                    if (item) {
                        item.start = parseFloat(start);
                        item.end = parseFloat(end);
                        item.done = 0;
                        fs.writeFileSync(jobFilePath, JSON.stringify(jobState, null, 2), 'utf8');
                        console.log(`✅ Segment updated and job file saved for hash: ${hash}`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(404);
                        res.end(JSON.stringify({ success: false, error: "Item not found" }));
                    }
                } catch (err) {
                    console.error(err);
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, error: err.message }));
                }
            });
        } else if (url.pathname === '/api/upload' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { hash, wav } = data;
                    if (!hash || !wav) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ success: false, error: "Missing fields" }));
                        return;
                    }

                    const bookName = JSON.parse(fs.readFileSync(jobFilePath, 'utf8')).bookName || "unknown";
                    const r2Key = `ep/${bookName}/${hash}.mp3`;
                    
                    const batchFolder = path.dirname(wav);
                    const segmentMp3 = path.join(batchFolder, `${hash}.mp3`);

                    console.log(`Uploading to R2: ${r2Key}`);
                    await s3Client.send(new PutObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: r2Key,
                        Body: fs.readFileSync(segmentMp3),
                        ContentType: "audio/mpeg",
                    }));

                    // Update job file
                    let jobState = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
                    const item = jobState.items.find(i => i.hash === hash);
                    if (item) {
                        item.done = 1;
                        fs.writeFileSync(jobFilePath, JSON.stringify(jobState, null, 2), 'utf8');
                        const doneCount = jobState.items.filter(i => i.done === 1).length;
                        const totalCount = jobState.items.length;
                        console.log(`✅ Uploaded [${doneCount}/${totalCount}]: "${item.text}" -> ${r2Key}`);
                        if (doneCount === totalCount) {
                            console.log(`\n🎉 All ${totalCount} items uploaded successfully!`);
                        }
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    console.error(err);
                    res.writeHead(500);
                    res.end(JSON.stringify({ success: false, error: err.message }));
                }
            });
        } else if (req.url.startsWith('/audio/')) {
            const relativePath = decodeURIComponent(req.url.replace('/audio/', ''));
            const filePath = path.join(reportDir, relativePath);
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                const fileSize = stat.size;
                const range = req.headers.range;
                const contentType = filePath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';

                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunksize = (end - start) + 1;
                    const file = fs.createReadStream(filePath, {start, end});
                    const head = {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': contentType,
                    };
                    res.writeHead(206, head);
                    file.pipe(res);
                } else {
                    const head = {
                        'Content-Length': fileSize,
                        'Content-Type': contentType,
                        'Accept-Ranges': 'bytes',
                    };
                    res.writeHead(200, head);
                    fs.createReadStream(filePath).pipe(res);
                }
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(` 🚀 Report UI running at http://localhost:${PORT}/ `);
        console.log(` ⚠️  Press Ctrl+C to stop the server and exit when finished `);
        console.log(`======================================================\n`);
    });
}

function getHtml(jobState, dateStr) {
    const batches = {};
    for (const item of jobState.items) {
        if (!item.batchId) continue;
        if (!batches[item.batchId]) batches[item.batchId] = [];
        batches[item.batchId].push(item);
    }
    
    let batchesHtml = '';
    const pastelColors = ['#eef2ff', '#f0fdf4', '#fdf4ff', '#fffbeb', '#fef2f2', '#f5f3ff', '#ecfeff', '#f8fafc'];
    let batchIndex = 0;

    for (const [batchId, items] of Object.entries(batches)) {
        if (items.length === 0) continue;
        
        const wavPath = items[0].wav;
        let relativeWav = '';
        if (wavPath) {
            const batchFolder = path.basename(path.dirname(wavPath));
            relativeWav = `/audio/${batchFolder}/${path.basename(wavPath)}`;
        }
        
        const bgColor = pastelColors[batchIndex % pastelColors.length];
        batchIndex++;
        
        batchesHtml += `
        <div class="batch-section" id="batch-${batchId}" style="background-color: ${bgColor}">
            <h2>Batch: ${batchId}</h2>
            ${relativeWav ? `
                <div class="player-container">
                    <audio id="audio-${batchId}" src="${relativeWav}"></audio>
                    <div class="custom-player" style="display: flex; align-items: center; gap: 10px;">
                        <button class="btn" onclick="togglePlay('${batchId}')" id="play-btn-${batchId}" style="width: 40px;">▶</button>
                        <span id="time-${batchId}" style="font-family: monospace; font-size: 1.1rem; min-width: 130px; text-align: center;">0.00 / 0.00</span>
                        <input type="range" id="seek-${batchId}" value="0" step="0.01" style="flex: 1;" oninput="seekAudio('${batchId}', this.value)">
                    </div>
                </div>
            ` : '<p>No combined.wav found for preview</p>'}
            <div class="items-grid">
        `;
        
        items.forEach((item, index) => {
            const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
            const mp3Path = `/audio/batch-${dateStr}-${batchId}/${item.hash}.mp3`;
            const rowClass = item.done === 0 ? 'item-row ready-to-upload' : 'item-row';
            batchesHtml += `
                <div class="${rowClass}" data-item="${itemJson}">
                    <div class="item-text">${item.text}</div>
                    <div class="item-meta">MD5: ${item.hash}</div>
                    <div class="item-meta" style="margin-top: 5px; margin-bottom: 5px;">
                        <audio src="${mp3Path}" controls style="height: 30px;"></audio>
                    </div>
                    <div class="item-controls">
                        <label>Start (s): <input type="number" step="0.01" class="time-input start-input" value="${item.start || 0}"></label>
                        <button class="btn" onclick="syncTime(this, '${batchId}', 'start')">⏱️ Start</button>
                        
                        <label style="margin-left:10px">End (s): <input type="number" step="0.01" class="time-input end-input" value="${item.end || 0}"></label>
                        <button class="btn" onclick="syncTime(this, '${batchId}', 'end')">⏱️ End</button>
                        <button class="btn copy-up-btn" style="display:none; margin-left: auto; background-color: #f8fafc;" onclick="copyUp(this, '${batchId}')">⬆️ Copy Up</button>
                        <button class="btn copy-down-btn" style="display:none; margin-left: 5px; background-color: #f8fafc;" onclick="copyDown(this, '${batchId}')">⬇️ Copy Down</button>
                    </div>
                </div>
            `;
        });
        
        batchesHtml += `
            </div>
        </div>
        `;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TTS Interactive Report - ${jobState.bookName}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f7f9; color: #333; margin: 0; padding: 20px; }
        h1 { margin-bottom: 20px; }
        .batch-section { background: #fff; border-radius: 8px; padding: 20px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .batch-section h2 { margin-top: 0; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px; font-size: 1.2rem; }
        .player-container { margin-bottom: 15px; position: sticky; top: 0; z-index: 10; background: inherit; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .items-grid { display: flex; flex-direction: column; gap: 10px; }
        .item-row { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: #fafbfc; transition: background 0.2s; cursor: pointer; }
        .item-row:hover { background: #f0f4f8; }
        .item-row.changed { border-color: #f59e0b; background: #fffbeb; }
        .item-text { font-weight: 500; font-size: 1.1rem; }
        .item-meta { font-size: 0.85rem; color: #64748b; }
        .item-controls { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
        .time-input { width: 80px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace; }
        .btn { padding: 5px 10px; border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; cursor: pointer; font-size: 0.9rem; }
        .btn:hover { background: #f1f5f9; }
        .btn-primary { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 500; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .main-container { max-width: 900px; margin: 0 auto; position: relative; padding-bottom: 80px; }
        .floating-container { position: fixed; bottom: 30px; right: 30px; display: flex; flex-direction: column; gap: 10px; z-index: 100; }
        .floating-btn { padding: 15px 25px; font-size: 1.1rem; border-radius: 50px; box-shadow: 0 4px 12px rgba(37,99,235,0.3); transition: all 0.3s; }
        .floating-btn:disabled { opacity: 0.6; transform: scale(0.95); cursor: not-allowed; box-shadow: none; }
    </style>
</head>
<body>
    <div class="main-container">
        <h1>TTS Job Report: ${jobState.bookName}</h1>
        ${batchesHtml}
    </div>
    <div class="floating-container">
        <button id="global-recut-btn" class="btn btn-primary floating-btn" onclick="reCutAll()" disabled>Re-Cut (0)</button>
        <button id="global-upload-btn" class="btn btn-primary floating-btn" onclick="uploadAll()" style="background-color: #10b981; border-color: #10b981;" disabled>Upload (0)</button>
    </div>
    <script>
        window.addEventListener('DOMContentLoaded', () => {
            const readyCount = document.querySelectorAll('.item-row.ready-to-upload').length;
            const uploadBtn = document.getElementById('global-upload-btn');
            uploadBtn.textContent = 'Upload (' + readyCount + ')';
            if (readyCount > 0) uploadBtn.disabled = false;
        });

        function updateFloatingBtn() {
            const changedCount = document.querySelectorAll('.item-row.changed').length;
            const btn = document.getElementById('global-recut-btn');
            btn.textContent = 'Re-Cut (' + changedCount + ')';
            if (changedCount > 0) {
                btn.disabled = false;
            } else {
                btn.disabled = true;
            }
        }

        document.querySelectorAll('.item-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (['INPUT', 'BUTTON', 'AUDIO'].includes(e.target.tagName)) return;
                
                document.querySelectorAll('.copy-up-btn').forEach(b => b.style.display = 'none');
                document.querySelectorAll('.copy-down-btn').forEach(b => b.style.display = 'none');
                
                const copyBtn = row.querySelector('.copy-up-btn');
                if (copyBtn) copyBtn.style.display = 'block';
                const downBtn = row.querySelector('.copy-down-btn');
                if (downBtn) downBtn.style.display = 'block';

                const item = JSON.parse(row.getAttribute('data-item'));
                const currentStart = parseFloat(row.querySelector('.start-input').value);
                const currentEnd = parseFloat(row.querySelector('.end-input').value);
                
                const audio = document.getElementById('audio-' + item.batchId);
                if (audio) {
                    audio.pause();
                    audio.currentTime = currentStart;
                    audio.play();

                    const checkEnd = () => {
                        if (audio.currentTime >= currentEnd) {
                            audio.pause();
                            audio.removeEventListener('timeupdate', checkEnd);
                        }
                    };
                    
                    audio.removeEventListener('timeupdate', window['_checkEnd_' + item.batchId]);
                    window['_checkEnd_' + item.batchId] = checkEnd;
                    audio.addEventListener('timeupdate', checkEnd);
                }
            });
            row.querySelectorAll('input').forEach(inp => {
                inp.addEventListener('input', () => {
                    row.classList.add('changed');
                    updateFloatingBtn();
                });
            });
        });

        document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
            const batchId = audio.id.replace('audio-', '');
            const timeDisp = document.getElementById('time-' + batchId);
            const seekBar = document.getElementById('seek-' + batchId);
            const playBtn = document.getElementById('play-btn-' + batchId);
            
            if (!timeDisp || !seekBar || !playBtn) return;
            
            audio.addEventListener('loadedmetadata', () => {
                seekBar.max = audio.duration;
                timeDisp.textContent = '0.00 / ' + audio.duration.toFixed(2);
            });
            
            audio.addEventListener('timeupdate', () => {
                seekBar.value = audio.currentTime;
                const dur = isNaN(audio.duration) ? 0 : audio.duration;
                timeDisp.textContent = audio.currentTime.toFixed(2) + ' / ' + dur.toFixed(2);
            });
            
            audio.addEventListener('play', () => playBtn.textContent = '⏸');
            audio.addEventListener('pause', () => playBtn.textContent = '▶');
            audio.addEventListener('ended', () => playBtn.textContent = '▶');
        });

        window.togglePlay = function(batchId) {
            const audio = document.getElementById('audio-' + batchId);
            if (audio.ended) {
                audio.currentTime = 0;
                audio.play();
            } else if (audio.paused) {
                audio.play();
            } else {
                audio.pause();
            }
        };
        
        window.seekAudio = function(batchId, val) {
            const audio = document.getElementById('audio-' + batchId);
            audio.currentTime = parseFloat(val);
        };

        function syncTime(btn, batchId, field) {
            const row = btn.closest('.item-row');
            const audio = document.getElementById('audio-' + batchId);
            const input = row.querySelector('.' + field + '-input');
            if (audio && input) {
                input.value = (Math.round(audio.currentTime * 100) / 100).toFixed(2);
                row.classList.add('changed');
                updateFloatingBtn();
            }
        }

        window.copyUp = function(btn, batchId) {
            const container = document.getElementById('batch-' + batchId);
            const rows = Array.from(container.querySelectorAll('.item-row'));
            const currentRow = btn.closest('.item-row');
            const startIndex = rows.indexOf(currentRow);
            
            if (startIndex === -1 || startIndex >= rows.length - 1) return;
            
            for (let i = startIndex; i < rows.length - 1; i++) {
                const prevRow = rows[i];
                const nextRow = rows[i + 1];
                
                const nextStart = parseFloat(nextRow.querySelector('.start-input').value) || 0;
                const nextEnd = parseFloat(nextRow.querySelector('.end-input').value) || 0;
                
                prevRow.querySelector('.start-input').value = nextStart.toFixed(2);
                prevRow.querySelector('.end-input').value = nextEnd.toFixed(2);
                prevRow.classList.add('changed');
            }
            updateFloatingBtn();
        };

        window.copyDown = function(btn, batchId) {
            const container = document.getElementById('batch-' + batchId);
            const rows = Array.from(container.querySelectorAll('.item-row'));
            const currentRow = btn.closest('.item-row');
            const startIndex = rows.indexOf(currentRow);
            
            if (startIndex === -1 || startIndex >= rows.length - 1) return;
            
            // Iterate backwards to shift items down without overwriting them before copying
            for (let i = rows.length - 1; i > startIndex; i--) {
                const prevRow = rows[i - 1];
                const nextRow = rows[i];
                
                const prevStart = parseFloat(prevRow.querySelector('.start-input').value) || 0;
                const prevEnd = parseFloat(prevRow.querySelector('.end-input').value) || 0;
                
                nextRow.querySelector('.start-input').value = prevStart.toFixed(2);
                nextRow.querySelector('.end-input').value = prevEnd.toFixed(2);
                nextRow.classList.add('changed');
            }
            updateFloatingBtn();
        };

        async function reCutAll() {
            const changedRows = Array.from(document.querySelectorAll('.item-row.changed'));
            if (changedRows.length === 0) return;

            const btn = document.getElementById('global-recut-btn');
            const uploadBtn = document.getElementById('global-upload-btn');
            btn.disabled = true;

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < changedRows.length; i++) {
                const row = changedRows[i];
                btn.textContent = 'Cutting ' + (i + 1) + ' / ' + changedRows.length + '...';
                
                const item = JSON.parse(row.getAttribute('data-item'));
                item.start = parseFloat(row.querySelector('.start-input').value);
                item.end = parseFloat(row.querySelector('.end-input').value);

                try {
                    const res = await fetch('/api/recut', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item)
                    });
                    const data = await res.json();
                    if (data.success) {
                        row.classList.remove('changed');
                        row.classList.add('ready-to-upload');
                        row.setAttribute('data-item', JSON.stringify(item));
                        successCount++;
                    } else {
                        console.error('Error for ' + item.hash + ':', data.error);
                        failCount++;
                    }
                } catch (err) {
                    console.error('Request failed for ' + item.hash + ':', err.message);
                    failCount++;
                }
            }

            btn.textContent = 'Cut ' + successCount + ' OK' + (failCount > 0 ? ', ' + failCount + ' failed' : '');
            
            const readyCount = document.querySelectorAll('.item-row.ready-to-upload').length;
            uploadBtn.textContent = 'Upload (' + readyCount + ')';
            if (readyCount > 0) uploadBtn.disabled = false;
            
            setTimeout(() => {
                updateFloatingBtn();
            }, 3000);
        }

        async function uploadAll() {
            const readyRows = Array.from(document.querySelectorAll('.item-row.ready-to-upload'));
            if (readyRows.length === 0) return;

            const btn = document.getElementById('global-upload-btn');
            btn.disabled = true;

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < readyRows.length; i++) {
                const row = readyRows[i];
                btn.textContent = 'Uploading ' + (i + 1) + ' / ' + readyRows.length + '...';
                
                const item = JSON.parse(row.getAttribute('data-item'));

                try {
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item)
                    });
                    const data = await res.json();
                    if (data.success) {
                        row.classList.remove('ready-to-upload');
                        successCount++;
                    } else {
                        console.error('Error for ' + item.hash + ':', data.error);
                        failCount++;
                    }
                } catch (err) {
                    console.error('Request failed for ' + item.hash + ':', err.message);
                    failCount++;
                }
            }

            btn.textContent = 'Uploaded ' + successCount + ' OK' + (failCount > 0 ? ', ' + failCount + ' failed' : '');
            setTimeout(() => {
                const readyCount = document.querySelectorAll('.item-row.ready-to-upload').length;
                btn.textContent = 'Upload (' + readyCount + ')';
                if (readyCount > 0) btn.disabled = false;
            }, 3000);
        }
    </script>
</body>
</html>
    `;
}

main();
