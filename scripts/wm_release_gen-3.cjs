const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { getAudioBatch } = require('./tts-gen-cut-save-3.cjs');

/**
 * Writing Map Release Generator (V3)
 * Converts writing map JSON data into a formatted interactive HTML mindmap.
 * Uses templates/wm-shell-master.html as the base shell.
 * Uses tts-gen-cut-save-3.cjs for audio processing.
 * 
 * Usage: node scripts/wm_release_gen-3.cjs [input_json_path] [output_html_path] [--regenerate|--skip-audio]
 */

const BASE_DIR = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(BASE_DIR, 'templates/wm-shell-master.html');

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

let isGeminiQuotaExhausted = false;

function resolvePath(p) {
    return path.isAbsolute(p) ? p : path.resolve(BASE_DIR, p);
}

function getAudioUrl(text, bookName) {
    const hash = crypto.createHash('md5').update(text).digest('hex');
    return `${PUBLIC_URL_BASE}/ep/${bookName}/${hash}.mp3`;
}

function generateHtml(data, jsonPath, indexPath = "index.html") {
    if (!fs.existsSync(TEMPLATE_PATH)) {
        throw new Error(`Template not found at ${TEMPLATE_PATH}`);
    }

    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const level = data.level || "Writing Strategy";
    const part = data.part || "Unit Practice";
    const section = data.section || "";
    const treeData = data.tree || data;

    const appTitle = (jsonPath.includes('-text-navigator-') || jsonPath.includes('-recall-map')) ? "Text Navigator" : "Writing Map";

    let writingPrompt = "";
    if (jsonPath.includes('-writing-map-')) {
        let mdPath = "";
        if (jsonPath.includes('-model-x')) {
            mdPath = jsonPath.replace(/-writing-map-model-x-?\d*\.json$/, '-writing-task-x.md');
        }
        if (!mdPath || !fs.existsSync(mdPath)) {
            if (jsonPath.includes('-model-')) {
                mdPath = jsonPath.replace(/-writing-map-model-?\d*\.json$/, '-writing-task.md');
            }
        }
        if (!mdPath || !fs.existsSync(mdPath)) {
            mdPath = jsonPath.replace(/-writing-map-.+\.json$/, '-writing-task.md');
        }
        if (!mdPath || !fs.existsSync(mdPath)) {
            mdPath = jsonPath.replace(/\.json$/, '.md');
        }
        if (mdPath && fs.existsSync(mdPath)) {
            writingPrompt = fs.readFileSync(mdPath, 'utf8')
                .replace(/\n/g, '<br>')
                .replace(/"/g, '&quot;');
        }
    }

    let nodeCounter = 0;
    function preprocess(node, isRoot = false) {
        if (!node) return;
        if (!node.id) {
            node.id = `node_${++nodeCounter}`;
        }
        if (!isRoot) {
            node.state = 'hidden';
        } else if (!node.state) {
            node.state = 'emoji';
        }
        if (node.children) {
            node.children.forEach(child => preprocess(child, false));
        }
    }
    preprocess(treeData, true);

    return template
        .replace(/{{APP_TITLE}}/g, appTitle)
        .replace(/{{PART}}/g, part)
        .replace(/{{LEVEL}}/g, level)
        .replace(/{{SECTION}}/g, section)
        .replace(/{{WRITING_PROMPT}}/g, writingPrompt)
        .replace(/{{[ \t]*TREE_DATA[ \t]*}}/g, JSON.stringify(treeData, null, 2))
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

        console.log(`Processing ${jsonPath}...`);
        const jsonData = JSON.parse(fs.readFileSync(absoluteInputPath, 'utf8'));
        const treeData = jsonData.tree || jsonData;

        const folderName = path.basename(path.dirname(jsonPath)).toLowerCase();
        const bookName = folderName.replace(/-[0-9]+$/, '').toLowerCase();

        // Calculate indexPath
        const bookFolder = path.basename(path.dirname(path.dirname(absoluteInputPath)));
        const bookRoot = path.join(BASE_DIR, bookFolder);
        const indexPath = path.join(path.relative(path.dirname(absoluteOutputPath), bookRoot), 'index.html');

        if (audioMode !== '1' && !isGeminiQuotaExhausted) {
            const allNodes = [];
            function collectNodes(node) {
                if (node.text) allNodes.push(node);
                if (node.children) node.children.forEach(collectNodes);
            }
            collectNodes(treeData);

            const existingHashes = new Set();
            if (audioMode === '2') {
                console.log(`Checking existing audio files for ${allNodes.length} items...`);
                await Promise.all(allNodes.map(async (node) => {
                    const hash = crypto.createHash('md5').update(node.text).digest('hex');
                    const r2Key = `ep/${bookName}/${hash}.mp3`;
                    try {
                        await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key }));
                        existingHashes.add(hash);
                    } catch (e) {}
                }));
            }

            const uniqueSentencesMap = new Map();
            allNodes.forEach(node => {
                const hash = crypto.createHash('md5').update(node.text).digest('hex');
                if (!uniqueSentencesMap.has(hash)) {
                    if (audioMode === '3' || !existingHashes.has(hash)) {
                        uniqueSentencesMap.set(hash, node.text);
                    }
                }
            });

            const uniqueTasks = Array.from(uniqueSentencesMap.values()).map(s => ({ context_sentence: s }));

            if (uniqueTasks.length > 0) {
                console.log(`Processing ${uniqueTasks.length} unique audio tasks...`);
                let currentBatch = [];
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

        function applyAudio(node) {
            if (node.text) {
                node.audio = getAudioUrl(node.text, bookName);
            }
            if (node.children) node.children.forEach(applyAudio);
        }
        applyAudio(treeData);

        const htmlContent = generateHtml(jsonData, absoluteInputPath, indexPath);
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
        const cleanup = () => { 
            process.stdin.removeListener('keypress', onKeyPress); 
            if (process.stdin.isTTY) process.stdin.setRawMode(false); 
            process.stdin.pause(); 
            process.stdout.write('\x1B[?25h\n'); 
        };
        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('keypress', onKeyPress);
        render();
    });
}

async function interactive() {
    const dataDir = resolvePath('data');
    if (!fs.existsSync(dataDir)) return;

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
                const subFiles = fs.readdirSync(fullPath).filter(f => (f.includes('-writing-map') || f.includes('-text-navigator')) && f.endsWith('.json'));
                subFiles.forEach(subFile => results.push(path.join(entry, subFile)));
            } else if ((entry.includes('-writing-map') || entry.includes('-text-navigator')) && entry.endsWith('.json')) {
                results.push(entry);
            }
        });
        return results;
    };

    if (selectedFolders.length === 1) {
        const folder = selectedFolders[0];
        const allFiles = getFilesFromFolder(folder);
        if (allFiles.length === 0) process.exit(0);
        const selectedFiles = await checkboxSelector(`Select files in ${folder}:`, allFiles, true);
        filesToProcess = selectedFiles.map(f => ({ folder, file: f }));
    } else {
        selectedFolders.forEach(folder => {
            const files = getFilesFromFolder(folder);
            filesToProcess.push(...files.map(f => ({ folder, file: f })));
        });
    }

    if (filesToProcess.length === 0) process.exit(0);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (q) => new Promise(res => rl.question(q, res));
    const aMode = await question('\nAudio: 1. Skip [default], 2. Missing, 3. Regenerate: ') || '1';
    rl.close();

    for (const task of filesToProcess) {
        const inputJson = path.join('data', task.folder, task.file);
        const outputHtml = path.join(task.folder, task.file.replace(".json", ".html"));
        await generate(inputJson, outputHtml, aMode);
    }
    process.exit(0);
}

const args = process.argv.slice(2);
if (args.length === 0) interactive();
else if (args.length >= 2) generate(args[0], args[1], args.includes('--regenerate') ? '3' : (args.includes('--skip-audio') ? '1' : '2'));
