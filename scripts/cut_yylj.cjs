const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const http = require('http');

function getMd5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

const jsonPath = path.resolve(__dirname, '../data/W9A/w9a-u1/w9a-u1-passage-decoder-s.json');
const srcAudio = path.resolve(__dirname, '../temp/audio/yylj/岳阳楼记老任.mp3');
const outputDir = path.resolve(__dirname, '../temp/audio/yylj/output');
const timingsPath = path.resolve(__dirname, '../temp/audio/yylj/timings.json');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Copy the original mp3 to the output folder so the web UI can play it for global reference
const webSrcAudioPath = path.join(outputDir, 'source.mp3');
if (!fs.existsSync(webSrcAudioPath)) {
    fs.copyFileSync(srcAudio, webSrcAudioPath);
}

function cutAudioSegments() {
    console.log("Loading timings configuration...");
    const timings = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const sentences = data.sections[0].sentences;

    if (sentences.length !== timings.length) {
        console.error(`Error: Sentences count (${sentences.length}) does not match timings count (${timings.length})`);
        return false;
    }

    for (let i = 0; i < sentences.length; i++) {
        const text = sentences[i].en;
        const hash = getMd5(text);
        const time = timings[i];
        const outputFile = path.join(outputDir, `${hash}.mp3`);

        console.log(`Cutting sentence #${i + 1}: [${time.start}s - ${time.end}s] -> ${hash}.mp3`);
        const cmd = `ffmpeg -i "${srcAudio}" -ss ${time.start} -to ${time.end} -c:a libmp3lame -qscale:a 2 "${outputFile}" -y -loglevel error`;
        execSync(cmd);
    }
    console.log("🎉 Successfully cut all segments.");
    return true;
}

// Run initial cut
cutAudioSegments();

// Create local server
const PORT = 3010;
const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;

    if (pathname === '/' || pathname === '/index.html') {
        // Serve HTML UI
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        const html = getHtmlUI();
        res.end(html);
    } else if (pathname === '/api/data') {
        // Serve sentences and timings
        const timings = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const sentences = data.sections[0].sentences.map((s, idx) => ({
            index: idx + 1,
            text: s.en,
            hash: getMd5(s.en),
            start: timings[idx].start,
            end: timings[idx].end
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sentences));
    } else if (pathname === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const newTimings = JSON.parse(body);
                fs.writeFileSync(timingsPath, JSON.stringify(newTimings, null, 2), 'utf8');
                const success = cutAudioSegments();
                if (success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to slice audio' }));
                }
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else {
        // Serve static mp3 files from output directory
        const fileName = path.basename(pathname);
        const filePath = path.join(outputDir, fileName);
        if (fs.existsSync(filePath) && fileName.endsWith('.mp3')) {
            const stat = fs.statSync(filePath);
            res.writeHead(200, {
                'Content-Type': 'audio/mpeg',
                'Content-Length': stat.size
            });
            const readStream = fs.createReadStream(filePath);
            readStream.pipe(res);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    }
});

server.listen(PORT, () => {
    console.log(`\n🌐 Interactive Audio Editor listening on http://localhost:${PORT}`);
    console.log(`👉 Open http://localhost:${PORT} in your browser to visually adjust timings!`);
    
    try {
        const isWsl = fs.existsSync('/proc/version') && fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft');
        if (isWsl) {
            execSync(`cmd.exe /c start http://localhost:${PORT}`);
        } else {
            const openCmd = process.platform === 'darwin' ? 'open' : (process.platform === 'win32' ? 'start' : 'xdg-open');
            execSync(`${openCmd} http://localhost:${PORT}`);
        }
    } catch (e) {
        // Silent ignore
    }
});

function getHtmlUI() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>岳阳楼记 Audio Slicing Tuner</title>
  <style>
    body {
      background: #0f172a;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 2rem;
      max-width: 1300px;
      margin: 0 auto;
    }
    h1 {
      font-size: 2rem;
      color: #c084fc;
      margin-bottom: 0.5rem;
      text-align: center;
    }
    p.subtitle {
      color: #94a3b8;
      text-align: center;
      margin-bottom: 2rem;
    }
    .main-audio-container {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .main-audio-container h2 {
      font-size: 1.1rem;
      margin: 0;
      color: #e2e8f0;
    }
    audio {
      width: 100%;
      height: 38px;
    }
    .editor-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .sentence-row {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.25rem;
      display: grid;
      grid-template-columns: 50px 1fr 320px 220px;
      gap: 1.5rem;
      align-items: center;
      transition: all 0.2s ease;
    }
    .sentence-row:hover {
      border-color: #818cf8;
      box-shadow: 0 4px 12px rgba(129, 140, 248, 0.1);
    }
    .index {
      font-size: 1.2rem;
      font-weight: 700;
      color: #818cf8;
      text-align: center;
    }
    .sentence-text {
      font-size: 1.05rem;
      line-height: 1.6;
      color: #f1f5f9;
    }
    .hash-sub {
      font-family: monospace;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.25rem;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .control-group label {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .time-input {
      background: #0f172a;
      border: 1px solid #475569;
      color: #f8fafc;
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      width: 80px;
      font-family: monospace;
      font-size: 0.9rem;
      text-align: center;
    }
    .time-input:focus {
      border-color: #818cf8;
      outline: none;
    }
    .btn {
      background: #818cf8;
      color: #ffffff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #6366f1;
    }
    .btn-test {
      background: #10b981;
    }
    .btn-test:hover {
      background: #059669;
    }
    .btn-save-all {
      background: #a855f7;
      font-size: 1.1rem;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      display: block;
      margin: 2rem auto;
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
    }
    .btn-save-all:hover {
      background: #9333ea;
    }
    .status-toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #10b981;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>🎙️ 岳阳楼记 Audio Slicing Tuner</h1>
  <p class="subtitle">Use this interactive editor to visually adjust sentence audio start/end boundaries. Test each segment instantly, and save to re-cut.</p>

  <div class="main-audio-container">
    <h2>完整音频参考 (Full Reference)</h2>
    <audio id="main-player" controls src="source.mp3"></audio>
    <div style="font-size: 0.8rem; color: #94a3b8;">
      Current time: <span id="current-ref-time" style="font-family: monospace; color: #818cf8;">0.00</span>s
    </div>
  </div>

  <div class="editor-grid" id="editor-grid">
    <!-- Row items will be loaded dynamically -->
  </div>

  <button class="btn btn-save-all" onclick="saveAll()">💾 Save Changes & Re-cut Audio</button>

  <div class="status-toast" id="toast">Saved & Sliced successfully!</div>

  <script>
    let sentences = [];
    const mainPlayer = document.getElementById('main-player');
    const refTimeText = document.getElementById('current-ref-time');

    mainPlayer.addEventListener('timeupdate', () => {
      refTimeText.textContent = mainPlayer.currentTime.toFixed(2);
    });

    async function loadData() {
      const res = await fetch('/api/data');
      sentences = await res.json();
      renderRows();
    }

    function renderRows() {
      const grid = document.getElementById('editor-grid');
      grid.innerHTML = '';
      sentences.forEach((s) => {
        const row = document.createElement('div');
        row.className = 'sentence-row';
        row.innerHTML = \`
          <div class="index">\${s.index}</div>
          <div>
            <div class="sentence-text">\${s.text}</div>
            <div class="hash-sub">MD5 Hash: \${s.hash}</div>
          </div>
          <div class="controls">
            <div class="control-group">
              <label>Start (s)</label>
              <input type="number" step="0.01" class="time-input" id="start-\${s.index}" value="\${s.start.toFixed(2)}" onchange="updateTime(\${s.index}, 'start', this.value)">
            </div>
            <div class="control-group">
              <label>End (s)</label>
              <input type="number" step="0.01" class="time-input" id="end-\${s.index}" value="\${s.end.toFixed(2)}" onchange="updateTime(\${s.index}, 'end', this.value)">
            </div>
            <button class="btn btn-test" style="margin-top: 1rem;" onclick="testSegment(\${s.index})">Play Segment</button>
          </div>
          <div class="audio-cell">
            <audio id="player-\${s.index}" controls src="\${s.hash}.mp3?t=\${Date.now()}"></audio>
          </div>
        \`;
        grid.appendChild(row);
      });
    }

    function updateTime(idx, field, value) {
      const val = parseFloat(value);
      if (!isNaN(val)) {
        sentences[idx - 1][field] = val;
      }
    }

    function testSegment(idx) {
      const s = sentences[idx - 1];
      mainPlayer.currentTime = s.start;
      mainPlayer.play();
      
      const checkEnd = () => {
        if (mainPlayer.currentTime >= s.end) {
          mainPlayer.pause();
          mainPlayer.removeEventListener('timeupdate', checkEnd);
        }
      };
      mainPlayer.addEventListener('timeupdate', checkEnd);
    }

    async function saveAll() {
      const payload = sentences.map(s => ({
        start: s.start,
        end: s.end
      }));
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        showToast();
        // Reload individual segment players with cache busting
        sentences.forEach((s) => {
          const player = document.getElementById(\`player-\${s.index}\`);
          if (player) {
            player.src = \`\${s.hash}.mp3?t=\${Date.now()}\`;
          }
        });
      } else {
        alert('Error: ' + result.error);
      }
    }

    function showToast() {
      const toast = document.getElementById('toast');
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3000);
    }

    loadData();
  </script>
</body>
</html>`;
}
