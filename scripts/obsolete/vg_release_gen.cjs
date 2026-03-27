const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

/**
 * Vocabulary Release Generator
 * Converts vocabulary JSON data into a formatted, print-optimized HTML guide.
 * Uses templates/vocab-guide.html as the base structure.
 * 
 * Usage: node scripts/vg_release_gen.cjs [input_json_path] [output_html_path]
 */

const BASE_DIR = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(BASE_DIR, 'templates/vocab-guide.html');

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
    
    console.log(`TTS Batch Request [ID: ${batchId}]: ${tasks.length} sentences. Total words: ${totalWords}.`);

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

        // Filter out leading silence (starting within first 0.1s)
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

function generateHtml(data, book, unit) {
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
        // Pre-calculate audio URL for the JSON data we will inject
        if (item.context_sentence) {
            item.audio = getAudioUrl(item.context_sentence, book, unit);
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
                "${item.context_sentence}"
            </div>
            <div class="hook-box"><span class="hook-label">🧠 核心记忆法:</span> ${item.memorization_hook}</div>
        </div>`;
    }).join('\n');

    return template
        .replace(/{{TITLE}}/g, title)
        .replace(/{{LEVEL}}/g, level)
        .replace(/{{VOCAB_DATA}}/g, JSON.stringify(data.unit_vocabulary))
        .replace(/{{ITEMS}}/g, itemsHtml);
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
        const bookName = folderName.replace(/-[0-9]+$/, '');
        const fileName = path.basename(jsonPath);
        const unitName = fileName.split('-')[1] || 'u1';

        const jsonData = JSON.parse(fs.readFileSync(absoluteInputPath, 'utf8'));
        const vocab = jsonData.unit_vocabulary;

        // Audio generation logic
        if (audioMode !== '1') {
            // Fetch existing metadata ONLY to decide what needs generating (if Missing mode)
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

            // Deduplicate sentences to avoid redundant TTS calls and R2 uploads
            const uniqueSentencesMap = new Map();
            vocab.forEach(item => {
                if (!item.context_sentence) return;
                const hash = crypto.createHash('md5').update(item.context_sentence).digest('hex');
                if (!uniqueSentencesMap.has(hash)) {
                    const exists = existingHashes.has(hash);
                    if (!exists || audioMode === '3') {
                        uniqueSentencesMap.set(hash, item.context_sentence);
                    }
                }
            });

            const uniqueTasks = Array.from(uniqueSentencesMap.values()).map(s => ({ context_sentence: s }));
            
            if (uniqueTasks.length > 0) {
                console.log(`Processing ${uniqueTasks.length} unique audio tasks...`);
                for (let i = 0; i < uniqueTasks.length; i += 10) {
                    const chunk = uniqueTasks.slice(i, i + 10);
                    await getAudioBatch(chunk, bookName, unitName);
                }
            }
        }

        // Apply base URLs (Versioning is handled by the client-side template)
        vocab.forEach(item => {
            if (item.context_sentence) {
                item.audio = getAudioUrl(item.context_sentence, bookName, unitName);
            }
        });

        const htmlContent = generateHtml(jsonData, bookName, unitName);

        const outputDir = path.dirname(absoluteOutputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

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
    if (selectedFolders.length === 1) {
        const folderPath = path.join(dataDir, selectedFolders[0]);
        const allFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('-vocab-guide.json'));
        const selectedFiles = await checkboxSelector(`Select files in ${selectedFolders[0]}:`, allFiles, true);
        filesToProcess = selectedFiles.map(f => ({ folder: selectedFolders[0], file: f }));
    } else {
        selectedFolders.forEach(folder => {
            const folderPath = path.join(dataDir, folder);
            const files = fs.readdirSync(folderPath).filter(f => f.endsWith('-vocab-guide.json'));
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
        // Save to root/{book}/filename.html, e.g. root/A7A/a7a-u3-vocab-guide.html
        const outputHtml = path.join(task.folder.toUpperCase(), task.file.replace(".json", ".html"));
        await generate(inputJson, outputHtml, aMode);
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    interactive();
} else if (args.length >= 2) {
    generate(args[0], args[1], args.includes('--regenerate') ? '3' : (args.includes('--skip-audio') ? '1' : '2'));
} else {
    console.error('❌ Usage: node scripts/vocab_release_gen.cjs [input_json_path] [output_html_path]');
    process.exit(1);
}
