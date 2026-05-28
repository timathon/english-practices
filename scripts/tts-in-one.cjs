const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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
        return { text, exists: true, hash, r2Key };
    } catch (e) {
        return { text, exists: false, hash, r2Key };
    }
}

async function main() {
    const inputDir = process.argv[2];
    if (!inputDir) {
        console.error("Usage: node scripts/tts-in-one.cjs [unit_directory_path] [--regenerate]");
        process.exit(1);
    }

    const absoluteDir = path.resolve(inputDir);
    if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) {
        console.error(`❌ Directory not found: ${absoluteDir}`);
        process.exit(1);
    }

    // Determine bookName (e.g. raz-b) from the directory path relative to the data directory
    const relativeToData = path.relative(path.resolve(__dirname, '../data'), absoluteDir);
    const bookName = relativeToData.split(path.sep)[0].toLowerCase();
    
    console.log(`Scanning unit directory: ${absoluteDir}`);
    console.log(`Resolved category/book name: ${bookName}`);

    const textsSet = new Set();
    const files = fs.readdirSync(absoluteDir);
    
    for (const file of files) {
        if (!file.endsWith('.json') || file.includes('-recall-map')) continue;
        const filePath = path.join(absoluteDir, file);
        console.log(`Reading file: ${file}`);
        
        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (file.includes('-vocab-guide')) {
                if (content.unit_vocabulary && Array.isArray(content.unit_vocabulary)) {
                    content.unit_vocabulary.forEach(item => {
                        if (item.context_sentence) textsSet.add(getCleanText(item.context_sentence));
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
                const treeData = content.tree || content;
                extractTreeText(treeData, textsSet);
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

    const forceRegenerate = process.argv.includes('--regenerate');

    let tasksToProcess = [];
    if (forceRegenerate) {
        tasksToProcess = Array.from(textsSet).map(text => ({ context_sentence: text }));
        console.log(`--regenerate flag active. Processing all ${tasksToProcess.length} items...`);
    } else {
        console.log("Checking existing audios on R2...");
        const checkResults = await Promise.all(Array.from(textsSet).map(text => checkAudioExists(text, bookName)));
        const missing = checkResults.filter(r => !r.exists);
        console.log(`R2 check complete: ${checkResults.length - missing.length} exist, ${missing.length} missing.`);
        
        tasksToProcess = missing.map(m => ({ context_sentence: m.text }));
    }

    if (tasksToProcess.length === 0) {
        console.log("✨ All audios already exist. Nothing to generate.");
        return;
    }

    console.log(`Generating audio for ${tasksToProcess.length} items using getAudioBatch (in chunks of 8)...`);
    
    const MIN_INTERVAL = 21000; // 21 seconds for < 3 RPM
    let lastRequestTime = 0;
    
    const chunks = [];
    for (let i = 0; i < tasksToProcess.length; i += 8) {
        chunks.push(tasksToProcess.slice(i, i + 8));
    }

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

        lastRequestTime = Date.now();
        // Spelling Hero words should be treated identically, so we call getAudioBatch
        const result = await getAudioBatch(batch, bookName);
        
        if (!result.success) {
            console.error(`❌ Batch ${i + 1} failed: ${result.reason}`);
            process.exit(1);
        }
        
        if (result.quotaExhausted) {
            console.warn(`⚠️ Quota warning or limit hit in batch ${i + 1}.`);
        }
    }
    
    console.log(`\n✅ Successfully generated and uploaded all missing audios!`);
}

main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
