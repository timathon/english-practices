const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { getAudioBatch } = require('./tts-gen-cut-save-3.cjs');
const readline = require('readline');

const BASE_DIR = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.resolve(BASE_DIR, 'templates/vocab-guide.html');

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
const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

function resolvePath(p) {
    return path.isAbsolute(p) ? p : path.resolve(BASE_DIR, p);
}

function getAudioUrl(text, book) {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    return `${PUBLIC_URL_BASE}/ep/${book}/${hash}.mp3`;
}

let isGeminiQuotaExhausted = false;

function generateHtml(data, book, indexPath = "index.html") {
    if (!fs.existsSync(TEMPLATE_PATH)) {
        throw new Error(`Template not found at ${TEMPLATE_PATH}`);
    }

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const level = data.level || "Vocabulary Study";
    const title = data.title || `${level} Vocabulary Guide`;
    
    const itemsHtml = data.unit_vocabulary.map((item, index) => {
        const pageLabel = item.page_number ? `P${item.page_number}` : '';
        const ipaValue = (item.ipa && !['na', 'n/a', 'none', ''].includes(item.ipa.toLowerCase().trim())) ? item.ipa : null;
        const ipaHtml = ipaValue ? `<span class="word-ipa">${ipaValue}</span>` : '';
        if (item.context_sentence) {
            item.audio = getAudioUrl(item.context_sentence, book);
        }
        return `
        <div class="vocab-item" data-word="${item.word.toLowerCase()}" data-index="${index}">
            <h2 class="word-title">
                <span>${index + 1}. ${item.word}${ipaHtml}</span>
                <div class="item-meta">
                    <span class="page-badge">${pageLabel}</span>
                    <input type="checkbox" class="hide-checkbox" title="Mark as Learnt" onclick="app.toggleWordHidden(${index})">
                </div>
            </h2>
            <div class="details" onclick="app.showItemCN(this)"><span class="label">🇨🇳 中文释义:</span> <span class="value">${item.meaning}</span><span class="cn-placeholder">Click to show</span></div>
            <div class="details"><span class="label">🎵 音节类型:</span> <span class="value">${item.syllable_type}</span></div>
            <div class="details"><span class="label">🔍 易混辨析:</span> <span class="value">${item.comparison}</span></div>
            <div class="context-box">
                <button class="play-btn" onclick="app.playAudio(this)" style="display: inline-flex;">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                </button>
                <div class="sentence-wrapper">
                    <div class="en-sentence" ${item.cn ? `data-cn="${item.cn}"` : ''}>"${item.context_sentence}"</div>
                    ${item.cn ? `<div class="cn-sentence">${item.cn}</div>` : ''}
                </div>
            </div>
            <div class="hook-box"><span class="hook-label">🧠 核心记忆法:</span> ${item.memorization_hook}</div>
        </div>`;
    }).join('\n');

    return template
        .replace(/{{TITLE}}/g, title)
        .replace(/{{LEVEL}}/g, level)
        .replace(/{{VOCAB_DATA}}/g, JSON.stringify(data.unit_vocabulary))
        .replace(/{{ITEMS}}/g, itemsHtml)
        .replace(/{{INDEX_PATH}}/g, indexPath);
}

async function generate(jsonPath, outputPath, audioMode = '1') {
    try {
        const absoluteInputPath = resolvePath(jsonPath);
        const absoluteOutputPath = resolvePath(outputPath);

        if (!fs.existsSync(absoluteInputPath)) {
            console.error(`❌ Input file not found: ${absoluteInputPath}`);
            return;
        }

        const folderName = path.basename(path.dirname(jsonPath)).toLowerCase();
        const bookName = folderName.replace(/-[0-9]+$/, '').toLowerCase();
        const jsonData = JSON.parse(fs.readFileSync(absoluteInputPath, 'utf8'));
        const vocab = jsonData.unit_vocabulary;

        // Calculate indexPath
        const bookFolder = path.basename(path.dirname(path.dirname(absoluteInputPath)));
        const bookRoot = path.join(BASE_DIR, bookFolder);
        let indexPath = path.join(path.relative(path.dirname(absoluteOutputPath), bookRoot), 'index.html');

        if (audioMode !== '1' && !isGeminiQuotaExhausted) {
            const existingHashes = new Set();
            if (audioMode === '2') {
                console.log(`Checking existing audio files for ${vocab.length} items...`);
                await Promise.all(vocab.map(async (item) => {
                    if (!item.context_sentence) return;
                    const hash = crypto.createHash('md5').update(item.context_sentence).digest('hex');
                    const r2Key = `ep/${bookName}/${hash}.mp3`;
                    try {
                        await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key }));
                        existingHashes.add(hash);
                    } catch (e) {}
                }));
            }

            const uniqueSentencesMap = new Map();
            vocab.forEach(item => {
                if (!item.context_sentence) return;
                const hash = crypto.createHash('md5').update(item.context_sentence).digest('hex');
                if (!uniqueSentencesMap.has(hash)) {
                    if (audioMode === '3' || !existingHashes.has(hash)) {
                        uniqueSentencesMap.set(hash, item.context_sentence);
                    }
                }
            });

            const uniqueTasks = Array.from(uniqueSentencesMap.values()).map(s => ({ context_sentence: s }));
            
            if (uniqueTasks.length > 0) {
                console.log(`Processing ${uniqueTasks.length} unique audio tasks...`);
                let currentBatch = [];
                const MIN_INTERVAL = 21000; // 21 seconds for < 3 RPM
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
                    const result = await getAudioBatch(batch, bookName);
                    if (result.quotaExhausted) isGeminiQuotaExhausted = true;
                };

                for (const task of uniqueTasks) {
                    if (isGeminiQuotaExhausted) break;
                    currentBatch.push(task);
                    if (currentBatch.length >= 8) {
                        await flushBatch(currentBatch);
                        currentBatch = [];
                    }
                }
                await flushBatch(currentBatch);
            }
        }

        vocab.forEach(item => {
            if (item.context_sentence) {
                item.audio = getAudioUrl(item.context_sentence, bookName);
            }
        });

        const htmlContent = generateHtml(jsonData, bookName, indexPath);
        const outputDir = path.dirname(absoluteOutputPath);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(absoluteOutputPath, htmlContent, 'utf8');
        console.log(`✅ Successfully generated: ${absoluteOutputPath}`);
    } catch (error) {
        console.error(`❌ Error processing ${jsonPath}:`, error.message);
    }
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
                const subFiles = fs.readdirSync(fullPath).filter(f => f.endsWith('-vocab-guide.json'));
                subFiles.forEach(subFile => {
                    results.push(path.join(entry, subFile));
                });
            } else if (entry.endsWith('-vocab-guide.json')) {
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
    const aMode = await question('\nAudio: 1. Skip [default], 2. Missing, 3. Regenerate: ') || '1';
    rl.close();

    for (const task of filesToProcess) {
        const inputJson = path.join('data', task.folder, task.file);
        const outputHtml = path.join(task.folder, task.file.replace(".json", ".html"));
        await generate(inputJson, outputHtml, aMode);
    }
}

const args = process.argv.slice(2);
if (args.length === 0) interactive();
else if (args.length >= 2) generate(args[0], args[1], args.includes('--regenerate') ? '3' : (args.includes('--skip-audio') ? '1' : '2'));
