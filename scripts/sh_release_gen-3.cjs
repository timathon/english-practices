const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { getAudioBatch } = require('./tts-gen-cut-save-3.cjs');

/**
 * Spelling Hero Release Generator (V2)
 * Uses tts-gen-cut-save.cjs for audio processing.
 */

const BASE_DIR = path.resolve(__dirname, '..');

// R2 Configuration (for existence checks)
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

function generateIndexHtml(title, items, backPath = null) {
    const listItems = items.map(item => `<li><a href="${item.path}">${item.name}</a></li>`).join('\n            ');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        ul { list-style-type: none; padding-left: 0; }
        li { margin-bottom: 10px; background: #f9f9f9; padding: 10px; border-radius: 8px; border: 1px solid #eee; }
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
        ["post", "builtin"].forEach(type => {
            const typePath = path.join(tsPath, type);
            if (!fs.existsSync(typePath)) return;
            const subfolders = fs.readdirSync(typePath).filter(f => fs.statSync(path.join(typePath, f)).isDirectory());
            subfolders.forEach(sub => {
                const subPath = path.join(typePath, sub);
                const files = fs.readdirSync(subPath)
                    .filter(f => f.endsWith(".html") && f !== "index.html")
                    .map(f => ({ name: f.replace(/-/g, " ").replace(".html", ""), path: f }));
                if (files.length > 0) fs.writeFileSync(path.join(subPath, "index.html"), generateIndexHtml(`${sub} Exercises`, files, "../index.html"));
            });
            const subIndexLinks = subfolders.filter(sub => fs.existsSync(path.join(typePath, sub, "index.html"))).map(sub => ({ name: sub, path: `${sub}/index.html` }));
            fs.writeFileSync(path.join(typePath, "index.html"), generateIndexHtml("Practice Exercises", subIndexLinks));
        });
    });
}

function loadFragment(type) {
    const fragmentPath = resolvePath(`templates/fragments/${type}.html`);
    const content = fs.readFileSync(fragmentPath, 'utf8');
    const sections = { CSS: "", UI: "", VARS: "", LOGIC: "" };
    const parts = content.split(/<!-- (CSS|UI|VARS|LOGIC) -->/);
    for (let i = 1; i < parts.length; i += 2) sections[parts[i]] = parts[i+1].trim();
    return sections;
}

let isGeminiQuotaExhausted = false;

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
    const bookName = folderName.replace(/-[0-9]+$/, '').toLowerCase();

    // 1. Audio Generation Logic
    const wordToAudioMap = {};
    const allWords = data.spelling_words.map(w => w.word);
    const uniqueWords = [...new Set(allWords)];
    const wordTasks = uniqueWords.map(word => {
        const hash = crypto.createHash('md5').update(word).digest('hex');
        const r2Key = `ep/${bookName}/${hash}.mp3`;
        return { word, r2Key, hash };
    });

    if (audioMode !== '1' && !isGeminiQuotaExhausted) {
        const existingHashes = new Set();
        if (audioMode === '2') {
            console.log(`Checking existing audio files for ${wordTasks.length} items...`);
            await Promise.all(wordTasks.map(async (task) => {
                try {
                    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: task.r2Key }));
                    existingHashes.add(task.hash);
                } catch (e) {}
            }));
        }

        const tasksToGenerate = [];
        for (const task of wordTasks) {
            if (audioMode === '3' || !existingHashes.has(task.hash)) {
                tasksToGenerate.push(task);
            }
        }

        if (tasksToGenerate.length > 0) {
            console.log(`Processing ${tasksToGenerate.length} unique audio tasks for Spelling Hero...`);
            const MIN_INTERVAL = 21000;
            let lastRequestTime = 0;

            const flushBatch = async (batch) => {
                if (batch.length === 0 || isGeminiQuotaExhausted) return;
                const now = Date.now();
                const timeSinceLast = now - lastRequestTime;
                if (timeSinceLast < MIN_INTERVAL) {
                    const waitTime = MIN_INTERVAL - timeSinceLast;
                    console.log(`Waiting ${waitTime / 1000}s to maintain RPM < 3...`);
                    await new Promise(r => setTimeout(r, waitTime));
                }
                lastRequestTime = Date.now();
                const result = await getAudioBatch(batch, bookName, { type: 'sh' });
                if (result.quotaExhausted) isGeminiQuotaExhausted = true;
            };

            await flushBatch(tasksToGenerate);
        }
    }

    // 2. Map word to final URL
    wordTasks.forEach(t => {
        wordToAudioMap[t.word] = t.audio || `${PUBLIC_URL_BASE}/ep/${bookName}/${t.hash}.mp3`;
    });

    // 3. Generate Questions
    let questions = [];
    data.spelling_words.forEach(sw => {
        questions.push({
            type: 'linear',
            word: sw.word,
            cn: sw.meaning,
            chunks: sw.chunks,
            audio: wordToAudioMap[sw.word]
        });
        questions.push({
            type: 'soup',
            word: sw.word,
            cn: sw.meaning,
            correctChunks: sw.chunks.map(c => c.correct),
            distractors: sw.chunks.flatMap(c => c.options.filter(opt => opt !== c.correct)),
            audio: wordToAudioMap[sw.word]
        });
    });

    const totalNeeded = Math.ceil(questions.length / 10) * 10;
    const originalCount = questions.length;
    for (let i = 0; i < totalNeeded - originalCount; i++) {
        questions.push(JSON.parse(JSON.stringify(questions[i % originalCount])));
    }

    const challenges = [];
    for (let i = 0; i < questions.length; i += 10) {
        const challengeData = questions.slice(i, i + 10);
        challenges.push({
            id: `ch-${i / 10 + 1}`,
            title: `Challenge ${i / 10 + 1}`,
            icon: ['🎯', '🚀', '🔥', '💎', '🌟'][Math.floor(i / 20) % 5],
            data: challengeData
        });
    }

    const json = JSON.stringify(challenges);
    const encrypted = xorEncrypt(Buffer.from(json, 'utf8'), key);
    const base64 = Buffer.from(encrypted).toString('base64');

    let html = fs.readFileSync(resolvePath('templates/sh-shell-master.html'), 'utf8');
    const auth = loadFragment(type);
    ['CSS', 'UI', 'VARS', 'LOGIC'].forEach(s => html = html.replace(new RegExp(`{{AUTH_${s}}}`, 'g'), auth[s]));
    
    const celebration = loadFragment('celebration');
    html = html.replace(/{{CELEBRATION_CSS}}/g, celebration.CSS);
    html = html.replace(/{{CELEBRATION_LOGIC}}/g, celebration.LOGIC);

    html = html.replace(/{{TITLE}}/g, data.title).replace(/{{LEVEL}}/g, data.level || "Spelling Hero")
               .replace(/{{PRIMARY_COLOR}}/g, data.primaryColor || "#58cc02")
               .replace(/{{PRIMARY_COLOR_DARK}}/g, data.primaryColorDark || "#46a302")
               .replace(/{{ID_A}}/g, ID_A).replace(/{{STORAGE_SUFFIX}}/g, data.storageSuffix || "")
               .replace(/{{PASSCODE}}/g, data.passcode || "TEACHER")
               .replace(/{{IPA_DICT}}/g, JSON.stringify(data.ipaDict || {}))
               .replace(/{{ENCRYPTED_DATA}}/g, base64);
    if (type === 'builtin') html = html.replace(/{{BUILTIN_KEY}}/g, key);

    let finalPath = resolvePath(outputPath);
    if (finalPath.startsWith(resolvePath('release'))) {
        const rel = path.relative(resolvePath('release'), finalPath);
        if (!/^\d{12}[\/\\]/.test(rel)) finalPath = path.join(resolvePath('release'), currentRunTimestamp, rel);
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
        const cleanup = () => { process.stdin.removeListener('keypress', onKeyPress); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\x1B[?25h\n'); };
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

    const getFilesFromFolder = (folderName) => {
        const folderPath = path.join(dataDir, folderName);
        const results = [];
        const entries = fs.readdirSync(folderPath);
        
        entries.forEach(entry => {
            const fullPath = path.join(folderPath, entry);
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                const subFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('-spelling-hero.json'));
                subFiles.forEach(subFile => {
                    results.push(path.join(entry, subFile));
                });
            } else if (entry.endsWith('-spelling-hero.json')) {
                results.push(entry);
            }
        });
        return results;
    };

    if (selectedFolders.length === 1) {
        const folder = selectedFolders[0];
        const allFiles = getFilesFromFolder(folder);
        const selectedFiles = await checkboxSelector(`Select files in ${folder}:`, allFiles, true);
        filesToProcess = selectedFiles.map(f => ({ folder, file: f }));
    } else {
        selectedFolders.forEach(folder => {
            const files = getFilesFromFolder(folder);
            filesToProcess.push(...files.map(f => ({ folder, file: f })));
        });
    }

    if (filesToProcess.length === 0) {
        console.log("No JSON files found to process.");
        return;
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (q) => new Promise(res => rl.question(q, res));
    const typeIdx = await question('\nSelect type: 1. post [default], 2. builtin: ');
    const uCountIdx = await question('\nUser count: 1. 3 [default], 2. 6, 3. 10: ');
    const vMonthsIdx = await question('\nValidity: 1. 3 [default], 2. 6, 3. 12: ');
    const aMode = await question('\nAudio: 1. Skip [default], 2. Missing, 3. Regenerate: ') || '1';
    rl.close();

    for (const task of filesToProcess) {
        const inputJson = path.join('data', task.folder, task.file);
        const outputHtml = path.join('release', typeIdx === '2' ? 'builtin' : 'post', task.folder, task.file.replace(".json", ".html"));
        await generate(inputJson, typeIdx === '2' ? 'builtin' : 'post', outputHtml, uCountIdx === '2' ? 6 : (uCountIdx === '3' ? 10 : 3), vMonthsIdx === '2' ? 6 : (vMonthsIdx === '3' ? 12 : 3), aMode);
    }
}

const args = process.argv.slice(2);
if (args.length === 0) interactive();
else if (args.length >= 3) generate(args[0], args[1], args[2], 3, 3, args.includes('--regenerate') ? '3' : (args.includes('--skip-audio') ? '1' : '2'));
