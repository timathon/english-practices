const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const BASE_DIR = path.resolve(__dirname, '..');

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";
const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

function resolvePath(p) {
    return path.isAbsolute(p) ? p : path.resolve(BASE_DIR, p);
}

function generateIndexHtml(title, files, backPath = "") {
    const listItems = files.map(f => `<li><a href="${f.path}">${f.name}</a></li>`).join("\n        ");
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: sans-serif; padding: 20px; line-height: 1.6; }
        h1 { color: #333; }
        ul { list-style: none; padding: 0; }
        li { margin-bottom: 10px; }
        a { text-decoration: none; color: #0366d6; font-weight: bold; display: block; }
        a:hover { color: #005cc5; }
        .back-link { margin-bottom: 20px; display: inline-block; color: #666; font-size: 0.9rem; }
    </style>
</head>
<body>
    ${backPath ? `<a href="${backPath}" class="back-link">← Back</a>` : ""}
    <h1>${title}</h1>
    <ul>
        ${listItems}
    </ul>
</body>
</html>`;
}

function rebuildIndexes() {
    const releaseDir = resolvePath('release');
    if (!fs.existsSync(releaseDir)) return;
    const timestampFolders = fs.readdirSync(releaseDir).filter(f => /^\d{12}$/.test(f));
    timestampFolders.forEach(ts => {
        const tsPath = path.join(releaseDir, ts);
        const folders = fs.readdirSync(tsPath).filter(f => fs.statSync(path.join(tsPath, f)).isDirectory());
        folders.forEach(sub => {
            const subPath = path.join(tsPath, sub);
            const files = fs.readdirSync(subPath)
                .filter(f => f.endsWith(".html") && f !== "index.html")
                .map(f => ({ name: f.replace(/-/g, " ").replace(".html", ""), path: f }));
            if (files.length > 0) fs.writeFileSync(path.join(subPath, "index.html"), generateIndexHtml(`${sub} Exercises`, files, "../index.html"));
        });
        const subIndexLinks = folders.filter(sub => fs.existsSync(path.join(tsPath, sub, "index.html"))).map(sub => ({ name: sub, path: `${sub}/index.html` }));
        if (subIndexLinks.length > 0) fs.writeFileSync(path.join(tsPath, "index.html"), generateIndexHtml("Vocab Master Exercises", subIndexLinks));
    });
}

function generateIDA() {
    let digits = "";
    while (true) {
        const num = Math.floor(Math.random() * (9999999 - 1111111 + 1)) + 1111111;
        const numStr = num.toString();
        const sum = numStr.split("").reduce((a, b) => a + parseInt(b), 0);
        if (sum % 7 === 0) {
            digits = numStr;
            break;
        }
    }
    const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randomLetters = "";
    for (let i = 0; i < 8; i++) {
        randomLetters += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    let result = new Array(15);
    let digitIndices = [];
    while (digitIndices.length < 7) {
        const idx = Math.floor(Math.random() * 15);
        if (!digitIndices.includes(idx)) digitIndices.push(idx);
    }
    digitIndices.sort((a, b) => a - b);
    let digitPointer = 0, letterPointer = 0;
    for (let i = 0; i < 15; i++) {
        if (digitIndices.includes(i)) result[i] = digits[digitPointer++];
        else result[i] = randomLetters[letterPointer++];
    }
    return result.join("");
}

function generateKey(idA) {
    let hash = 5381;
    for (let i = 0; i < idA.length; i++) {
        hash = ((hash << 5) + hash) + idA.charCodeAt(i);
    }
    return hash >>> 0;
}

function xorEncrypt(bytes, key) {
    const keyBytes = new Uint8Array(4);
    keyBytes[0] = key & 0xFF;
    keyBytes[1] = (key >> 8) & 0xFF;
    keyBytes[2] = (key >> 16) & 0xFF;
    keyBytes[3] = (key >> 24) & 0xFF;
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        result[i] = bytes[i] ^ keyBytes[i % 4];
    }
    return result;
}

function getTimestamp() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes());
}

const currentRunTimestamp = getTimestamp();

function getAudioUrl(sentence, book, unit) {
    const hash = crypto.createHash('md5').update(sentence).digest('hex');
    return `${PUBLIC_URL_BASE}/ep/${book}/${hash}.mp3`;
}

let isGeminiQuotaExhausted = false;

async function getAudioBatch(tasks, book, unit) {
    if (tasks.length === 0) return;
    if (!process.env.GOOGLE_API_KEY) {
        console.warn("Skipping audio generation: GOOGLE_API_KEY not set.");
        return;
    }
    if (isGeminiQuotaExhausted) {
        console.warn("Skipping audio generation: Gemini quota already exhausted.");
        return;
    }

    const TEMP_DIR = path.join(BASE_DIR, 'temp', 'audio');
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const batchId = crypto.randomBytes(4).toString('hex');
    const batchOutputDir = path.join(TEMP_DIR, `batch_${batchId}`);
    if (!fs.existsSync(batchOutputDir)) fs.mkdirSync(batchOutputDir, { recursive: true });

    const combinedWav = path.join(batchOutputDir, `batch_${batchId}_combined.wav`);
    const tempPy = path.join(TEMP_DIR, `batch_${batchId}_tts.py`);

    const separator = " . . . . . "; 
    const sentences = tasks.map(t => t.context_sentence);
    const combinedText = sentences.join(separator) + separator;
    const totalWords = combinedText.trim().split(/\s+/).length;
    
    console.log(`TTS Batch Request [ID: ${batchId}]: ${tasks.length} sentences for Vocab Master. Total words: ${totalWords}.`);

    const pythonScript = `
import wave
import sys
import time
from google import genai
from google.genai import types

client = genai.Client(api_key="${process.env.GOOGLE_API_KEY}")

def get_tts():
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-preview-tts",
                contents="Say clearly: ${combinedText.replace(/"/g, '\\"')}",
                config=types.GenerateContentConfig(
                    responseModalities=["AUDIO"],
                    speechConfig=types.SpeechConfig(
                        voiceConfig=types.VoiceConfig(
                            prebuiltVoiceConfig=types.PrebuiltVoiceConfig(
                                voiceName="Kore"
                            )
                        )
                    )
                )
            )
            return response
        except Exception as e:
            if "500" in str(e) and attempt < 2:
                time.sleep(2)
                continue
            if "429" in str(e): print("MARK_QUOTA_EXHAUSTED")
            print(f"FAILED: {e}", file=sys.stderr)
            sys.exit(1)

try:
    response = get_tts()
    with wave.open("${combinedWav}", "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(response.candidates[0].content.parts[0].inline_data.data)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED FINAL: {e}", file=sys.stderr)
    sys.exit(1)
`;

    fs.writeFileSync(tempPy, pythonScript);
    try {
        const pyOutput = execSync(`python3 "${tempPy}"`).toString();
        if (pyOutput.includes("MARK_QUOTA_EXHAUSTED")) isGeminiQuotaExhausted = true;

        const silenceOutput = execSync(`ffmpeg -i "${combinedWav}" -af "silencedetect=n=-30dB:d=0.3" -f null - 2>&1`).toString();
        const allSilences = [];
        const startRe = /silence_start: ([\d.]+)/g;
        const endRe = /silence_end: ([\d.]+)/g;
        let sMatch, eMatch;
        while ((sMatch = startRe.exec(silenceOutput)) !== null && (eMatch = endRe.exec(silenceOutput)) !== null) {
            const start = parseFloat(sMatch[1]);
            const end = parseFloat(eMatch[1]);
            allSilences.push({ start, end, duration: end - start });
        }

        const candidateSilences = allSilences.filter(s => s.start > 0.1);
        const silences = candidateSilences
            .sort((a, b) => b.duration - a.duration)
            .slice(0, tasks.length)
            .sort((a, b) => a.start - b.start);

        console.log(`Detected ${allSilences.length} total pauses, using ${silences.length} longest (after filtering ${allSilences.length - candidateSilences.length} leading) as separators.`);

        let startTime = 0;
        for (let i = 0; i < tasks.length; i++) {
            const item = tasks[i];
            const hash = crypto.createHash('md5').update(item.context_sentence).digest('hex');
            
            // Internal filename: order_firstword_hash.mp3
            const firstWord = item.context_sentence.split(' ')[0].replace(/[^a-zA-Z]/g, '');
            const segmentFileName = `${String(i + 1).padStart(3, '0')}_${firstWord}_${hash}.mp3`;
            const segmentMp3 = path.join(batchOutputDir, segmentFileName);
            
            const s = silences[i];
            const endTime = s ? (s.start + s.end) / 2 : (startTime + 10); 

            execSync(`ffmpeg -i "${combinedWav}" -ss ${startTime} -to ${endTime} -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
            
            const r2Key = `ep/${book}/${hash}.mp3`;
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: r2Key,
                Body: fs.readFileSync(segmentMp3),
                ContentType: "audio/mpeg",
            }));
            
            item.audio = `${PUBLIC_URL_BASE}/${r2Key}`;
            startTime = endTime;
        }
    } catch (err) {
        console.error("Batch TTS processing failed:", err.message);
    } finally {
        if (fs.existsSync(tempPy)) fs.unlinkSync(tempPy);
        // Preserving combinedWav as requested
    }
}

function loadFragment(type) {
    const fragmentPath = resolvePath(`templates/fragments/${type}.html`);
    const content = fs.readFileSync(fragmentPath, 'utf8');
    const sections = { CSS: "", UI: "", VARS: "", LOGIC: "" };
    const parts = content.split(/<!-- (CSS|UI|VARS|LOGIC) -->/);
    for (let i = 1; i < parts.length; i += 2) sections[parts[i]] = parts[i+1].trim();
    return sections;
}

async function generate(jsonPath, type, outputPath, userCount = 3, validityMonths = 3, audioMode = '1') {
    const absoluteJsonPath = resolvePath(jsonPath);
    const data = JSON.parse(fs.readFileSync(absoluteJsonPath, 'utf8'));
    let ID_A = data.ID_A || generateIDA();
    const digits = ID_A.match(/\d/g);
    const lastDigit = digits ? parseInt(digits[digits.length - 1]) : 0;
    const userMap = { 3: 'a', 6: 'b', 10: 'c' }, validityMap = { 3: 'o', 6: 'p', 12: 'q' };
    const suffix = String.fromCharCode((userMap[userCount] || 'a').charCodeAt(0) + lastDigit) + String.fromCharCode((validityMap[validityMonths] || 'o').charCodeAt(0) + lastDigit);
    ID_A += suffix;
    const key = generateKey(ID_A);

    const folderName = path.basename(path.dirname(jsonPath)).toLowerCase();
    const bookName = folderName.replace(/-[0-9]+$/, '');
    const fileName = path.basename(jsonPath);
    const unitName = fileName.split('-')[1] || 'u1';

    // 1. Audio Generation Logic (Only check R2 if not in Skip mode)
    if (audioMode !== '1') {
        const existingHashes = new Set();
        const allQuestions = data.challenges.flatMap(c => c.questions || []);

        if (audioMode === '2') {
            console.log(`Checking existing audio files for ${allQuestions.length} items...`);
            await Promise.all(allQuestions.map(async (q) => {
                if (!q.context_sentence) return;
                const hash = crypto.createHash('md5').update(q.context_sentence).digest('hex');
                const r2Key = `ep/${bookName}/${hash}.mp3`;
                try {
                    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key }));
                    existingHashes.add(hash);
                } catch (e) {}
            }));
        }

        for (const challenge of data.challenges) {
            const tasksToGenerate = [];
            for (const q of challenge.questions) {
                if (q.context_sentence) {
                    const hash = crypto.createHash('md5').update(q.context_sentence).digest('hex');
                    if (audioMode === '3' || !existingHashes.has(hash)) {
                        tasksToGenerate.push(q);
                    }
                }
            }
            if (tasksToGenerate.length > 0) {
                await getAudioBatch(tasksToGenerate, bookName, unitName);
            }
        }
    }

    // 2. Apply Audio URLs (Base URLs only, versioning handled by browser-side refresh)
    for (const challenge of data.challenges) {
        for (const q of challenge.questions) {
            if (q.context_sentence) {
                q.audio = getAudioUrl(q.context_sentence, bookName, unitName);
            }
        }
    }
    
    const json = JSON.stringify(data.challenges);
    const encrypted = xorEncrypt(Buffer.from(json, 'utf8'), key);
    const base64 = Buffer.from(encrypted).toString('base64');

    let html = fs.readFileSync(resolvePath('templates/vm-shell-master.html'), 'utf8');
    const auth = loadFragment(type);
    ['CSS', 'UI', 'VARS', 'LOGIC'].forEach(s => html = html.replace(new RegExp(`{{AUTH_${s}}}`, 'g'), auth[s]));
    
    // Inject Celebration Fragment
    const celebration = loadFragment('celebration');
    html = html.replace(/{{CELEBRATION_CSS}}/g, celebration.CSS);
    html = html.replace(/{{CELEBRATION_LOGIC}}/g, celebration.LOGIC);

    html = html.replace(/{{TITLE}}/g, data.title).replace(/{{LEVEL}}/g, data.level || "Vocab Master")
               .replace(/{{PRIMARY_COLOR}}/g, data.primaryColor || "#3b82f6")
               .replace(/{{PRIMARY_COLOR_DARK}}/g, data.primaryColorDark || "#2563eb")
               .replace(/{{ID_A}}/g, ID_A).replace(/{{STORAGE_SUFFIX}}/g, data.storageSuffix || "")
               .replace(/{{PASSCODE}}/g, data.passcode || "TEACHER")
               .replace(/{{ENCRYPTED_DATA}}/g, base64);
    if (type === 'builtin') html = html.replace(/{{BUILTIN_KEY}}/g, key);

    let finalPath = resolvePath(outputPath);
    if (finalPath.startsWith(resolvePath('release'))) {
        const rel = path.relative(resolvePath('release'), finalPath);
        if (!/^\d{12}[/\\]/.test(rel)) finalPath = path.join(resolvePath('release'), currentRunTimestamp, rel);
    }
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    fs.writeFileSync(finalPath, html);
    console.log(`Generated ${finalPath} (${type}) with ID_A: ${ID_A}`);
    rebuildIndexes();
}

async function checkboxSelector(message, options, defaultSelected = false) {
    return new Promise((resolve) => {
        const choices = options.map(o => ({ name: o, selected: defaultSelected }));
        let cursor = 0;
        const render = () => {
            process.stdout.write('\x1B[?25l\x1B[H\x1B[J');
            console.log(`\n${message}\n (Use space to toggle, "a" to select all, enter to confirm)\n`);
            choices.forEach((choice, i) => console.log(`${i === cursor ? '> ' : '  '}${choice.selected ? '[x]' : '[ ]'} ${choice.name}`));
        };
        const onKeyPress = (str, key) => {
            if (key.name === 'up') cursor = (cursor - 1 + choices.length) % choices.length;
            else if (key.name === 'down') cursor = (cursor + 1) % choices.length;
            else if (key.name === 'space') choices[cursor].selected = !choices[cursor].selected;
            else if (key.name === 'a') { const all = choices.every(c => c.selected); choices.forEach(c => c.selected = !all); }
            else if (key.name === 'return') { cleanup(); resolve(choices.filter(c => c.selected).map(c => c.name)); }
            else if (key.ctrl && key.name === 'c') { cleanup(); process.exit(); }
            render();
        };
        const cleanup = () => { process.stdin.removeListener('keypress', onKeyPress); if (process.stdin.isTTY) process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\x1B[?25h\n'); };
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('keypress', onKeyPress);
        render();
    });
}

async function interactive() {
    const dataDir = resolvePath('data');
    const folders = fs.readdirSync(dataDir).filter(f => fs.statSync(path.join(dataDir, f)).isDirectory());
    const selectedFolders = await checkboxSelector('Select folders to process:', folders);
    if (selectedFolders.length === 0) return;
    let filesToProcess = [];
    if (selectedFolders.length === 1) {
        const allFiles = fs.readdirSync(path.join(dataDir, selectedFolders[0])).filter(f => f.endsWith('-vocab-master.json'));
        const selectedFiles = await checkboxSelector(`Select files in ${selectedFolders[0]}:`, allFiles, true);
        filesToProcess = selectedFiles.map(f => ({ folder: selectedFolders[0], file: f }));
    } else {
        selectedFolders.forEach(folder => filesToProcess.push(...fs.readdirSync(path.join(dataDir, folder)).filter(f => f.endsWith('-vocab-master.json')).map(f => ({ folder, file: f }))));
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (q) => new Promise(res => rl.question(q, res));
    const typeIdx = await question('\nSelect type: 1. post [default], 2. builtin: ');
    const uCountIdx = await question('\nUser count: 1. 3 [default], 2. 6, 3. 10: ');
    const vMonthsIdx = await question('\nValidity: 1. 3 [default], 2. 6, 3. 12: ');
    const aMode = await question('\nAudio: 1. Skip [default], 2. Missing, 3. Regenerate: ') || '1';
    rl.close();
    for (const task of filesToProcess) {
        await generate(path.join('data', task.folder, task.file), typeIdx === '2' ? 'builtin' : 'post', path.join('release', task.folder, task.file.replace(".json", ".html")), uCountIdx === '2' ? 6 : (uCountIdx === '3' ? 10 : 3), vMonthsIdx === '2' ? 6 : (vMonthsIdx === '3' ? 12 : 3), aMode);
    }
}

const args = process.argv.slice(2);
if (args.length === 0) interactive();
else if (args.length >= 3) generate(args[0], args[1], args[2], 3, 3, args.includes('--regenerate') ? '3' : (args.includes('--skip-audio') ? '1' : '2'));
