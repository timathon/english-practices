/**
 * tts-chirp.cjs (scripts/tts/tts-chirp.cjs)
 * 
 * Core synthesis module for Google Cloud Text-to-Speech (Chirp 3 HD).
 * Contains reusable functions for scanning practice files, generating audio,
 * and maintaining state JSON.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const textToSpeech = require('@google-cloud/text-to-speech');
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");

const ttsClient = new textToSpeech.TextToSpeechClient();

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";

const CHIRP3_VOICES = [
    /*'Achernar', */ 'Achird', 'Algenib', /* 'Algieba', */ 'Alnilam', /* 'Aoede', */ 'Autonoe',
    'Callirrhoe', 'Charon', 'Despina', 'Enceladus', 'Erinome', 'Fenrir', /* 'Gacrux', */
    'Iapetus', /* 'Kore', */ 'Laomedeia', 'Leda', 'Orus', /* 'Puck', */ /* 'Pulcherrima', */
    'Rasalgethi', /* 'Sadachbia', */ 'Sadaltager',  /* 'Schedar', */ 'Sulafat', 'Umbriel',
    'Vindemiatrix', 'Zephyr', /* 'Zubenelgenubi' */
];

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

function expandAbbrForTTS(text) {
    if (!text) return "";
    let processed = text
        .trim()
        .replace(/\bsth\b/gi, 'something')
        .replace(/\bsb\b/gi, 'somebody');

    // Append trailing period if text lacks terminal punctuation to force falling/declarative intonation
    if (processed && !/[.!?]$/.test(processed)) {
        processed += '.';
    }
    return processed;
}

// Helper to resolve target audio record JSON path in temp/audio_records
function getAudioRecordInfo(absPath) {
    const repoRoot = path.resolve(__dirname, '../../');

    let relativeToData = path.relative(path.resolve(repoRoot, 'v2-data'), absPath);
    if (relativeToData.startsWith('..')) {
        relativeToData = path.relative(path.resolve(repoRoot, 'data'), absPath);
    }

    const isDir = fs.statSync(absPath).isDirectory();
    const unitDirRel = isDir ? relativeToData : path.dirname(relativeToData);
    const folderName = path.basename(unitDirRel);
    const targetJsonPath = path.join(repoRoot, 'temp/audio_records', unitDirRel, `${folderName}-records.json`);

    return { targetJsonPath, relativeToData };
}

// Helper to sync audio records JSON (only items with upload-done === 1)
function syncAudioRecords(targetAbsPath, items, bName) {
    try {
        const recordInfo = getAudioRecordInfo(targetAbsPath);
        const targetJsonPath = recordInfo.targetJsonPath;
        const targetDir = path.dirname(targetJsonPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        let existingRecords = { bookName: bName, items: [] };
        if (fs.existsSync(targetJsonPath)) {
            try {
                existingRecords = JSON.parse(fs.readFileSync(targetJsonPath, 'utf8'));
                if (!Array.isArray(existingRecords.items)) existingRecords.items = [];
            } catch (e) { }
        }

        const recordMap = new Map();
        existingRecords.items.forEach(item => {
            if (item.hash) recordMap.set(item.hash, item);
        });

        items.forEach(item => {
            if (item["upload-done"] === 1 || item["upload-done"] === "1") {
                const rec = recordMap.get(item.hash) || {};
                recordMap.set(item.hash, {
                    ...rec,
                    text: item.text,
                    hash: item.hash,
                    voice: item.voice || rec.voice || "",
                    "tts-done": 1,
                    "upload-done": 1,
                    r2Url: item.r2Url || rec.r2Url || `https://r2.smartedu.com/ep/${bName}/${item.hash}.mp3`,
                    updatedAt: new Date().toISOString()
                });
            }
        });

        existingRecords.bookName = bName;
        existingRecords.items = Array.from(recordMap.values());

        fs.writeFileSync(targetJsonPath, JSON.stringify(existingRecords, null, 2), 'utf8');
        console.log(`📝 Updated audio record index: ${targetJsonPath}`);
    } catch (e) {
        console.error(`⚠️ Failed to update audio_records: ${e.message}`);
    }
}

/**
 * Runs TTS synthesis for a target (directory, practice file, or chirp job JSON).
 */
async function runTtsSynthesis({ targetPath, explicitVoice = null, batchSize = 5, speakingRate = 0.9, forceRegenerate = false, targetHashes = null }) {
    const absoluteTarget = path.resolve(targetPath);
    if (!fs.existsSync(absoluteTarget)) {
        throw new Error(`Target path not found: ${absoluteTarget}`);
    }

    const isChirpJson = path.basename(absoluteTarget).startsWith('chirp-') && absoluteTarget.endsWith('.json');

    let bookName = "a8a";
    let batchId = "";
    let reportDir = path.resolve(__dirname, '../../temp/audio');
    let batchOutputDir = "";
    let jobJsonPath = "";
    let jobState = null;

    if (isChirpJson) {
        console.log(`📄 Target is existing Chirp State JSON: ${absoluteTarget}`);
        jobState = JSON.parse(fs.readFileSync(absoluteTarget, 'utf8'));
        bookName = jobState.bookName || "a8a";
        batchId = jobState.batchId || path.basename(absoluteTarget, '.json');
        jobJsonPath = absoluteTarget;
        batchOutputDir = path.join(reportDir, batchId);
        if (!fs.existsSync(batchOutputDir)) fs.mkdirSync(batchOutputDir, { recursive: true });
    } else {
        const isDir = fs.statSync(absoluteTarget).isDirectory();
        let relativeToData = path.relative(path.resolve(__dirname, '../../v2-data'), absoluteTarget);
        if (relativeToData.startsWith('..')) {
            relativeToData = path.relative(path.resolve(__dirname, '../../data'), absoluteTarget);
        }
        bookName = relativeToData.split(path.sep)[0].toLowerCase();
    }

    console.log(`🎙️  Target: ${absoluteTarget}`);
    console.log(`📚 Category/Book name: ${bookName}`);
    console.log(`⚡ Concurrency Batch Size: ${batchSize}`);
    console.log(`⏱️  Speaking Rate: ${speakingRate}x`);
    if (explicitVoice) {
        console.log(`🗣️  Voice: Fixed (${explicitVoice})`);
    } else {
        console.log(`🗣️  Voice Mode: Rotating through ${CHIRP3_VOICES.length} Chirp 3 HD voices`);
    }

    if (!isChirpJson) {
        const textsSet = new Set();
        function getFilesRecursively(dir) {
            let results = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(getFilesRecursively(filePath));
                } else {
                    results.push(filePath);
                }
            });
            return results;
        }

        const isDir = fs.statSync(absoluteTarget).isDirectory();
        const files = isDir ? getFilesRecursively(absoluteTarget) : [absoluteTarget];

        for (const filePath of files) {
            const file = path.basename(filePath);
            if (!file.endsWith('.json') || file.includes('-recall-map') || file.includes('-writing-map') || file.includes('-grammar-wizard')) continue;

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
                } else if (file.includes('-passage-decoder')) {
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
                console.error(`❌ Failed to parse ${filePath}: ${e.message}`);
            }
        }

        console.log(`🔍 Found ${textsSet.size} unique text items.`);
        if (textsSet.size === 0) {
            console.log("No texts found to process.");
            return null;
        }

        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        batchId = `chirp-${ts}`;
        batchOutputDir = path.join(reportDir, batchId);
        jobJsonPath = path.join(reportDir, `${batchId}.json`);

        if (!fs.existsSync(batchOutputDir)) fs.mkdirSync(batchOutputDir, { recursive: true });

        jobState = {
            targetPath: absoluteTarget,
            bookName,
            batchId,
            items: Array.from(textsSet).map(text => ({
                text,
                "tts-done": 0,
                "upload-done": 0,
                voice: "",
                hash: crypto.createHash('md5').update(text).digest('hex'),
                mp3: ""
            }))
        };
    }

    function saveJobState() {
        try {
            fs.writeFileSync(jobJsonPath, JSON.stringify(jobState, null, 2), 'utf8');
        } catch (e) {
            console.error(`⚠️ Failed to save job state JSON: ${e.message}`);
        }
    }

    saveJobState();

    let indicesToSynthesize = [];
    if (isChirpJson) {
        indicesToSynthesize = jobState.items
            .map((item, idx) => {
                if (targetHashes) {
                    return targetHashes.has(item.hash) ? idx : -1;
                }
                return (item["tts-done"] === 0 || item["tts-done"] === "0") ? idx : -1;
            })
            .filter(idx => idx !== -1);
        console.log(`🎯 Processing ${indicesToSynthesize.length} item(s) with tts-done === 0 in ${jobJsonPath}.`);
    } else if (targetHashes) {
        indicesToSynthesize = jobState.items
            .map((item, idx) => targetHashes.has(item.hash) ? idx : -1)
            .filter(idx => idx !== -1);
    } else {
        indicesToSynthesize = jobState.items.map((_, idx) => idx);
    }

    // Load existing audio_records map if not forcing regenerate
    const audioRecordsMap = new Map(); // hash -> record object

    let recordInfo = null;
    if (!isChirpJson) {
        try {
            recordInfo = getAudioRecordInfo(absoluteTarget);
            if (fs.existsSync(recordInfo.targetJsonPath)) {
                const existingData = JSON.parse(fs.readFileSync(recordInfo.targetJsonPath, 'utf8'));
                if (existingData && existingData.items && Array.isArray(existingData.items)) {
                    existingData.items.forEach(item => {
                        if (item.hash) audioRecordsMap.set(item.hash, item);
                    });
                }
            }
        } catch (e) {
            console.error(`⚠️ Notice parsing audio_records: ${e.message}`);
        }
    }

    // 1. Check audio_records first
    if (!forceRegenerate && audioRecordsMap.size > 0) {
        const foundIndices = [];
        indicesToSynthesize.forEach(idx => {
            const item = jobState.items[idx];
            if (audioRecordsMap.has(item.hash)) {
                const rec = audioRecordsMap.get(item.hash);
                item["tts-done"] = 1;
                item["upload-done"] = rec["upload-done"] !== undefined ? rec["upload-done"] : 1;
                item["regenbatch"] = "batch-audio-record-existing";
                if (!item["voice"] && rec.voice) {
                    item["voice"] = rec.voice;
                }
                item["r2Url"] = rec.r2Url || `https://r2.smartedu.com/ep/${bookName}/${item.hash}.mp3`;
                foundIndices.push(idx);
            }
        });

        if (foundIndices.length > 0) {
            console.log(`⚡ Found ${foundIndices.length} item(s) in local audio_records cache. Skipping R2 check & TTS for those.`);
            indicesToSynthesize = indicesToSynthesize.filter(idx => !foundIndices.includes(idx));
            saveJobState();
        }
    }

    // 2. Check R2 if still not found
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && !forceRegenerate && indicesToSynthesize.length > 0) {
        console.log(`☁️ Checking R2 bucket [${BUCKET_NAME}] for existing MP3 files in batches of 5...`);
        const r2ExistingIndices = new Set();
        const R2_BATCH = 5;
        let checkedCount = 0;
        const totalToCheck = indicesToSynthesize.length;

        for (let i = 0; i < indicesToSynthesize.length; i += R2_BATCH) {
            const chunk = indicesToSynthesize.slice(i, i + R2_BATCH);
            await Promise.all(chunk.map(async (idx) => {
                const item = jobState.items[idx];
                const r2Key = `ep/${bookName}/${item.hash}.mp3`;
                try {
                    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key }));
                    r2ExistingIndices.add(idx);
                    item["tts-done"] = 1;
                    item["upload-done"] = 1;
                    item["regenbatch"] = "batch-r2-existing";
                    if (!item["voice"]) {
                        item["voice"] = "R2-Existing";
                    }
                    item["r2Url"] = `https://r2.smartedu.com/ep/${bookName}/${item.hash}.mp3`;
                } catch (e) {
                    // Object does not exist in R2
                } finally {
                    checkedCount++;
                    process.stdout.write(`\r🔍 Checking R2 cache [${checkedCount}/${totalToCheck}] (Found existing: ${r2ExistingIndices.size})`);
                }
            }));
        }
        process.stdout.write('\n');

        if (r2ExistingIndices.size > 0) {
            console.log(`⏭️ Found ${r2ExistingIndices.size} item(s) already in R2. Skipping synthesis for those.`);
            indicesToSynthesize = indicesToSynthesize.filter(idx => !r2ExistingIndices.has(idx));
            saveJobState();
        }
    }

    console.log(`📁 Saving generated MP3s locally to: ${batchOutputDir}`);
    console.log(`📄 Job state tracking JSON: ${jobJsonPath}`);
    console.log(`🚀 Starting GCP Chirp 3 concurrent generation (batch size ${batchSize}) for ${indicesToSynthesize.length} items...\n`);

    let completedCount = 0;

    for (let index = 0; index < indicesToSynthesize.length; index += batchSize) {
        const chunkIndices = indicesToSynthesize.slice(index, index + batchSize);

        await Promise.all(chunkIndices.map(async (i) => {
            const item = jobState.items[i];
            const localMp3Path = path.join(batchOutputDir, `${item.hash}.mp3`);

            let currentVoiceShort = explicitVoice || item.voice;
            if (!currentVoiceShort) {
                currentVoiceShort = CHIRP3_VOICES[i % CHIRP3_VOICES.length];
            }

            const fullVoiceName = currentVoiceShort.startsWith('en-')
                ? currentVoiceShort
                : `en-US-Chirp3-HD-${currentVoiceShort}`;

            try {
                const speechText = expandAbbrForTTS(item.text);
                const request = {
                    input: { text: speechText },
                    voice: {
                        languageCode: 'en-US',
                        name: fullVoiceName,
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        pitch: 0,
                        speakingRate: speakingRate
                    },
                };

                const [response] = await ttsClient.synthesizeSpeech(request);
                fs.writeFileSync(localMp3Path, response.audioContent, 'binary');

                completedCount++;
                item["tts-done"] = 1;
                item.voice = currentVoiceShort;
                item.mp3 = localMp3Path;
                process.stdout.write(`\r✅ Generated [${completedCount}/${indicesToSynthesize.length}] (${currentVoiceShort}): "${item.text.slice(0, 35)}${item.text.length > 35 ? '...' : ''}"`);
            } catch (err) {
                console.error(`\n❌ Error synthesizing speech for "${item.text}": ${err.message}`);
            }
        }));

        saveJobState();
    }

    if (!isChirpJson && recordInfo) {
        syncAudioRecords(absoluteTarget, jobState.items, bookName);
    }

    const ttsCompletedItems = jobState.items.filter(i => i["tts-done"] === 1);
    console.log(`\n\n🎉 Finished generating ${ttsCompletedItems.length} MP3 files in ${batchOutputDir}`);

    return {
        jobJsonPath,
        batchOutputDir,
        jobState
    };
}

module.exports = {
    runTtsSynthesis,
    CHIRP3_VOICES,
    getAudioRecordInfo,
    syncAudioRecords
};
