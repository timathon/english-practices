const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const http = require('http');

function getMd5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

const srcAudio = path.resolve(__dirname, '../temp/audio/yx/yx.mp3');
const outputDir = path.resolve(__dirname, '../temp/audio/yx/output');
const timingsPath = path.resolve(__dirname, '../temp/audio/yx/timings.json');

const items = [
    { text: "咏雪 - 刘义庆" },
    { text: "谢太傅寒雪日内集，与儿女讲论文义。" },
    { text: "俄而雪骤，公欣然曰：“白雪纷纷何所似？”" },
    { text: "兄子胡儿曰：“撒盐空中差可拟。”" },
    { text: "兄女曰：“未若柳絮因风起。”" },
    { text: "公大笑乐。" },
    { text: "即公大兄无奕女，左将军王凝之妻也。" }
];

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Copy the original mp3 to the output folder so the web UI can play it
const webSrcAudioPath = path.join(outputDir, 'source.mp3');
if (fs.existsSync(srcAudio)) {
    fs.copyFileSync(srcAudio, webSrcAudioPath);
}

// Initialize timings.json if not exists
if (!fs.existsSync(timingsPath)) {
    const initialTimings = items.map(() => ({ start: 0.0, end: 5.0 }));
    fs.writeFileSync(timingsPath, JSON.stringify(initialTimings, null, 2), 'utf8');
}

function cutAudioSegments() {
    console.log("Loading timings configuration...");
    if (!fs.existsSync(srcAudio)) {
        console.error("Source audio not found at: " + srcAudio);
        return false;
    }
    const timings = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));

    if (items.length !== timings.length) {
        console.error(`Error: Items count (${items.length}) does not match timings count (${timings.length})`);
        return false;
    }

    for (let i = 0; i < items.length; i++) {
        const text = items[i].text;
        const hash = getMd5(text);
        const time = timings[i];
        const outputFile = path.join(outputDir, `${hash}.mp3`);

        console.log(`Cutting segment #${i + 1}: [${time.start}s - ${time.end}s] -> ${hash}.mp3 (${text})`);
        const cmd = `ffmpeg -i "${srcAudio}" -ss ${time.start} -to ${time.end} -c:a libmp3lame -qscale:a 2 "${outputFile}" -y -loglevel error`;
        try {
            execSync(cmd);
        } catch (err) {
            console.error(`Failed to cut segment #${i + 1}`, err);
        }
    }
    console.log("🎉 Successfully cut all segments.");
    return true;
}

// Run initial cut
cutAudioSegments();

// Create local server
const PORT = 3012;
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
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        const html = getHtmlUI();
        res.end(html);
    } else if (pathname === '/api/data') {
        const timings = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
        const sentences = items.map((s, idx) => ({
            index: idx + 1,
            text: s.text,
            hash: getMd5(s.text),
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
        const fileName = path.basename(pathname);
        const filePath = path.join(outputDir, fileName);
        if (fs.existsSync(filePath) && fileName.endsWith('.mp3')) {
            const stat = fs.statSync(filePath);
            const range = req.headers.range;
            
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(filePath, {start, end});
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'audio/mpeg',
                });
                file.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': stat.size,
                    'Accept-Ranges': 'bytes'
                });
                const readStream = fs.createReadStream(filePath);
                readStream.pipe(res);
            }
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
  <title>咏雪 Audio Slicing Tuner</title>
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
      color: #38bdf8;
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
      border-color: #38bdf8;
      box-shadow: 0 4px 12px rgba(56, 189, 248, 0.1);
    }
    .index {
      font-size: 1.2rem;
      font-weight: 700;
      color: #38bdf8;
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
    .btn {
      background: #0284c7;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn:hover {
      background: #0369a1;
    }
    .btn-secondary {
      background: #334155;
      color: #f1f5f9;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    .action-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .play-icon::before { content: "▶"; }
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #10b981;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      opacity: 0;
      transform: translateY(100px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <h1>咏雪 Audio Slicing Tuner</h1>
  <p class="subtitle">Visually fine-tune start and end times for each sentence segment and export to mp3</p>

  <div class="main-audio-container">
    <h2>Original Audio Source</h2>
    <audio id="main-audio" src="/source.mp3" controls></audio>
  </div>

  <div class="action-header">
    <h2>Segments Editor</h2>
    <button class="btn" onclick="saveAll()">💾 Save Timings & Cut Audio</button>
  </div>

  <div class="editor-grid" id="grid">
    <!-- Rows dynamically generated -->
  </div>

  <div class="toast" id="toast">✅ Timings saved and audio cut successfully!</div>

  <script>
    let mainAudio = document.getElementById('main-audio');
    let sentenceData = [];

    async function loadData() {
      const res = await fetch('/api/data');
      sentenceData = await res.json();
      renderGrid();
    }

    function renderGrid() {
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      sentenceData.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'sentence-row';
        row.innerHTML = \`
          <div class="index">\${item.index}</div>
          <div>
            <div class="sentence-text">\${item.text}</div>
            <div class="hash-sub">MD5: \${item.hash}</div>
          </div>
          <div class="controls">
            <div class="control-group">
              <label>Start (s)</label>
              <input type="number" step="0.01" class="time-input" id="start-\${index}" value="\${item.start}" onchange="updateVal(\${index}, 'start', this.value)">
            </div>
            <div class="control-group">
              <label>End (s)</label>
              <input type="number" step="0.01" class="time-input" id="end-\${index}" value="\${item.end}" onchange="updateVal(\${index}, 'end', this.value)">
            </div>
            <button class="btn btn-secondary" onclick="useCurrentTime(\${index}, 'start')">⏱️ Start</button>
            <button class="btn btn-secondary" onclick="useCurrentTime(\${index}, 'end')">⏱️ End</button>
          </div>
          <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="playSegment(\${index})">▶ Play Cut</button>
          </div>
        \`;
        grid.appendChild(row);
      });
    }

    function updateVal(index, key, val) {
      sentenceData[index][key] = parseFloat(val) || 0;
    }

    function useCurrentTime(index, key) {
      const time = Math.round(mainAudio.currentTime * 100) / 100;
      sentenceData[index][key] = time;
      document.getElementById(\`\${key}-\${index}\`).value = time;
    }

    function playSegment(index) {
      const item = sentenceData[index];
      mainAudio.currentTime = item.start;
      mainAudio.play();
      
      const checkEnd = () => {
        if (mainAudio.currentTime >= item.end) {
          mainAudio.pause();
          mainAudio.removeEventListener('timeupdate', checkEnd);
        }
      };
      
      // Remove any existing timeupdate listener first
      mainAudio.removeEventListener('timeupdate', checkEnd);
      mainAudio.addEventListener('timeupdate', checkEnd);
    }

    async function saveAll() {
      const timings = sentenceData.map(item => ({
        start: item.start,
        end: item.end
      }));
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timings)
      });
      const result = await res.json();
      if (result.success) {
        showToast();
      } else {
        alert('Error: ' + result.error);
      }
    }

    function showToast() {
      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    window.onload = loadData;
  </script>
</body>
</html>`;
}
