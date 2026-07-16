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
        if (currentChunk.length > 0 && (currentWords + wordCount > maxWords)) {
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
    const noUpload = true; // Always skip upload, handle manually via report UI
    const useXl = process.argv.includes('--xl') || process.argv.includes('xl');
    const resume = process.argv.includes('--resume') || process.argv.includes('resume');

    if (useXl) {
        if (process.env.GOOGLE_API_KEY_FREE) {
            process.env.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY_FREE;
            console.log("🔑 Switched to GOOGLE_API_KEY_FREE");
        } else {
            console.warn("⚠️ Warning: GOOGLE_API_KEY_FREE is not set in environment!");
        }
    }

    let bookName = "";
    let tongjiaMap = {};
    let jobFilePath = "";
    let jobState = null;

    if (resume) {
        const reportDir = path.resolve(__dirname, '../temp/audio');
        if (fs.existsSync(reportDir)) {
            const jobFiles = fs.readdirSync(reportDir)
                .filter(f => f.startsWith('tts-job-') && f.endsWith('.json'))
                .sort();
            if (jobFiles.length > 0) {
                const lastJobFile = jobFiles[jobFiles.length - 1];
                jobFilePath = path.join(reportDir, lastJobFile);
                console.log(`Resuming from last job file: ${lastJobFile}`);
                try {
                    jobState = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
                    bookName = jobState.bookName;
                    tongjiaMap = jobState.tongjiaMap || {};
                } catch (e) {
                    console.error(`❌ Failed to parse job file: ${e.message}`);
                    process.exit(1);
                }
            } else {
                console.error("❌ No previous tts-job-*.json file found to resume.");
                process.exit(1);
            }
        } else {
            console.error("❌ No temp/audio directory found to resume.");
            process.exit(1);
        }
    } else {
        const inputDir = process.argv[2];
        if (!inputDir) {
            console.error("Usage: node scripts/tts-in-one.cjs [unit_directory_path] [--regenerate] [--no-upload] [--xl] [--resume]");
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

        let tasksToProcess = [];
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
        }

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const reportDir = path.resolve(__dirname, '../temp/audio');
        if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
        jobFilePath = path.join(reportDir, `tts-job-${ts}.json`);

        jobState = {
            bookName,
            tongjiaMap,
            noUpload,
            useXl,
            forceRegenerate,
            items: tasksToProcess.map(t => ({
                text: t.context_sentence,
                done: 0,
                batchId: null,
                hash: null
            }))
        };

        try {
            fs.writeFileSync(jobFilePath, JSON.stringify(jobState, null, 2), 'utf8');
            console.log(`📄 Created initial job state file with ${jobState.items.length} items: ${jobFilePath}`);
        } catch (e) {
            console.error(`⚠️ Failed to save initial job state file: ${e.message}`);
        }
    }

    try {
        const remainingItems = jobState.items.filter(item => item.done !== 1);
        if (remainingItems.length === 0) {
            console.log("✨ All items in the job are already done.");
            return;
        }

        let chunks = [];
        if (jobState.useXl) {
            chunks = chunkTasksByWordCount(remainingItems.map(item => ({ context_sentence: item.text })), 100);
            console.log(`Generating audio in batches of max 100 words using GOOGLE_API_KEY_FREE...`);
        } else {
            const tasksArray = remainingItems.map(item => ({ context_sentence: item.text }));
            for (let i = 0; i < tasksArray.length; i += 10) {
                chunks.push(tasksArray.slice(i, i + 10));
            }
            console.log(`Generating audio for ${remainingItems.length} items using getAudioBatch (in chunks of 10)...`);
        }

        const MIN_INTERVAL = 21000; // 21 seconds for < 3 RPM
        let lastRequestTime = 0;

        console.log(`Split tasks into ${chunks.length} batches.`);

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

            // Generate batchId beforehand
            const batchId = crypto.randomBytes(4).toString('hex');
            
            // Update batchId in JSON state for the items in this batch
            const batchTexts = new Set(batch.map(item => item.context_sentence));
            for (const item of jobState.items) {
                if (batchTexts.has(item.text) && item.done !== 1) {
                    item.batchId = batchId;
                }
            }
            try {
                fs.writeFileSync(jobFilePath, JSON.stringify(jobState, null, 2), 'utf8');
            } catch (e) {
                console.error(`⚠️ Failed to persist batchId update: ${e.message}`);
            }

            lastRequestTime = Date.now();
            const totalWords = batch.reduce((acc, item) => {
                const text = item.text || item.context_sentence || item.word || item.en || "";
                return acc + text.split(/\s+/).length;
            }, 0);
            const calculatedTimeout = Math.max(240000, totalWords * 3000);
            console.log(`⏱️  Setting timeout to ${calculatedTimeout / 1000}s based on word count (${totalWords} words).`);

            const result = await getAudioBatch(batch, bookName, {
                skipUpload: jobState.noUpload,
                tongjiaMap,
                timeout: calculatedTimeout,
                batchId: batchId
            });
            
            if (!result.success) {
                console.error(`❌ Batch ${i + 1} failed: ${result.reason}`);
                process.exit(1);
            }
            
            if (result.quotaExhausted) {
                console.warn(`⚠️ Quota warning or limit hit in batch ${i + 1}.`);
            }

            // Update hash/wav/timing after TTS+cutting; done stays 0 until upload completes
            if (result.files) {
                for (const f of result.files) {
                    const item = jobState.items.find(it => it.text === f.text && it.done !== 1);
                    if (item) {
                        // done remains 0; set to 1 only after upload via report UI
                        item.hash = f.hash;
                        item.wav = f.wav;
                        item.start = f.start;
                        item.end = f.end;
                    }
                }
                try {
                    fs.writeFileSync(jobFilePath, JSON.stringify(jobState, null, 2), 'utf8');
                    console.log(`📄 Saved progress to: ${jobFilePath}`);
                } catch (e) {
                    console.error(`⚠️ Failed to save progress file: ${e.message}`);
                }
            }
        }
        
        console.log(`\n✅ Successfully generated${jobState.noUpload ? ' (local only, no R2 upload)' : ' and uploaded'} all missing audios!`);
    } finally {
        if (jobFilePath) {
            console.log(`\n📊 Launching generate-report.cjs for: ${jobFilePath}`);
            try {
                execSync(`node scripts/generate-report.cjs "${jobFilePath}"`, { stdio: 'inherit' });
            } catch (err) {
                console.error("⚠️ Failed to execute generate-report.cjs:", err.message);
            }
        }
    }
}

main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
