'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const { S3Client, HeadObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

// ── Environment Configuration ──────────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_AI_TOKEN = process.env.CLOUDFLARE_AI_API_TOKEN;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!CF_ACCOUNT_ID) {
    console.error('❌  CLOUDFLARE_ACCOUNT_ID is not set.');
    process.exit(1);
}
if (!CF_AI_TOKEN) {
    console.error('❌  CLOUDFLARE_AI_API_TOKEN is not set.');
    process.exit(1);
}
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    console.error('❌  AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is not set.');
    process.exit(1);
}

// ── S3 / R2 Configuration ──────────────────────────────────────────────────────
const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";

// ── Helpers ────────────────────────────────────────────────────────────────────
function getCleanText(text) {
    if (!text) return "";
    return text.trim();
}

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

function callMeloTTS(text) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ prompt: text, lang: 'en' });
        const options = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/myshell-ai/melotts`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CF_AI_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const buf = Buffer.concat(chunks);
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode}: ${buf.toString('utf8')}`));
                }
                const contentType = res.headers['content-type'] || '';
                if (contentType.includes('audio/')) {
                    resolve(buf);
                } else {
                    try {
                        const json = JSON.parse(buf.toString('utf8'));
                        const audioData = json?.result?.audio || json?.audio || json?.data;
                        if (!audioData) return reject(new Error('No audio field in response: ' + JSON.stringify(json)));
                        resolve(Buffer.from(audioData, 'base64'));
                    } catch (e) {
                        reject(new Error('Failed to parse response: ' + e.message));
                    }
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const inputFile = process.argv[2];
    if (!inputFile) {
        console.error("Usage: node scripts/tts-cf.cjs [json_file_path]");
        process.exit(1);
    }

    const absoluteFile = path.resolve(inputFile);
    if (!fs.existsSync(absoluteFile) || !fs.statSync(absoluteFile).isFile()) {
        console.error(`❌ File not found: ${absoluteFile}`);
        process.exit(1);
    }

    // Determine bookName (e.g. a7b) from the directory path relative to the data directory
    const relativeToData = path.relative(path.resolve(__dirname, '../data'), absoluteFile);
    const bookName = relativeToData.split(path.sep)[0].toLowerCase();

    console.log(`📖 Reading file: ${absoluteFile}`);
    console.log(`Resolved book/category name: ${bookName}`);

    const textsSet = new Set();
    const content = JSON.parse(fs.readFileSync(absoluteFile, 'utf8'));

    // Extract unique sentences depending on the content structure
    // 1. vocab guide
    if (content.unit_vocabulary && Array.isArray(content.unit_vocabulary)) {
        content.unit_vocabulary.forEach(item => {
            if (item.context_sentence) textsSet.add(getCleanText(item.context_sentence));
            if (item.word) textsSet.add(getCleanText(item.word));
        });
    }
    // 2. vocab master / sentence architect
    if (content.challenges && Array.isArray(content.challenges)) {
        content.challenges.forEach(challenge => {
            if (challenge.questions && Array.isArray(challenge.questions)) {
                challenge.questions.forEach(q => {
                    if (q.context_sentence) textsSet.add(getCleanText(q.context_sentence));
                });
            }
            const items = challenge.sentences || challenge.data || [];
            items.forEach(item => {
                if (item.en) textsSet.add(getCleanText(item.en));
            });
        });
    }
    // 3. spelling hero
    if (content.spelling_words && Array.isArray(content.spelling_words)) {
        content.spelling_words.forEach(w => {
            if (w.word) textsSet.add(getCleanText(w.word));
        });
    }
    // 4. text navigator / writing map
    if (content.tree || content.id === 'root') {
        const treeData = content.tree || content;
        extractTreeText(treeData, textsSet);
    }
    // 5. passage decoder
    if (content.sections && Array.isArray(content.sections)) {
        content.sections.forEach(section => {
            if (section.sentences && Array.isArray(section.sentences)) {
                section.sentences.forEach(item => {
                    if (item.en) textsSet.add(getCleanText(item.en));
                });
            }
        });
    }

    const uniqueTexts = Array.from(textsSet).filter(Boolean);
    console.log(`Found ${uniqueTexts.length} unique texts.`);

    if (uniqueTexts.length === 0) {
        console.log("No texts found to process.");
        return;
    }

    const tasks = uniqueTexts.map(text => {
        const hash = crypto.createHash('md5').update(text).digest('hex');
        const r2Key = `ep/${bookName}/cf/${hash}.mp3`;
        return { text, r2Key };
    });

    console.log(`Processing all ${tasks.length} texts in batches of 10...`);

    const BATCH_SIZE = 10;
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tasks.length / BATCH_SIZE)} (${batch.length} items)...`);
        
        await Promise.all(batch.map(async (item, idx) => {
            const itemIndex = i + idx + 1;
            try {
                const audioBuffer = await callMeloTTS(item.text);
                const uploadParams = {
                    Bucket: BUCKET_NAME,
                    Key: item.r2Key,
                    Body: audioBuffer,
                    ContentType: "audio/mpeg",
                };
                await s3Client.send(new PutObjectCommand(uploadParams));
                console.log(`   [${itemIndex}/${tasks.length}] 🎙️ "${item.text}" … ✅ Uploaded to R2: ${item.r2Key} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
            } catch (err) {
                console.log(`   [${itemIndex}/${tasks.length}] 🎙️ "${item.text}" … ❌ Failed: ${err.message}`);
            }
        }));

        // Small delay between batches to avoid rate-limiting
        if (i + BATCH_SIZE < tasks.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    try {
        content.tts = 1;
        fs.writeFileSync(absoluteFile, JSON.stringify(content, null, 2), 'utf8');
        console.log(`📝 Updated ${inputFile} with { tts: 1 }`);
    } catch (e) {
        console.error(`❌ Failed to update JSON file with tts: 1: ${e.message}`);
    }

    console.log('\n✨  Done!');
}

main().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
