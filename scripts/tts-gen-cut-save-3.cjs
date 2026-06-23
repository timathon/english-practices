const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const BASE_DIR = path.resolve(__dirname, '..');

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

/**
 * Common TTS Generation, Silence Cutting, and R2 Saving Module (V3)
 * Uses enhanced splitting, trimming, and timeout/retry logic.
 */
async function getAudioBatch(tasks, book, options = {}) {
    if (tasks.length === 0) return { success: true };
    if (!process.env.GOOGLE_API_KEY) {
        console.warn("Skipping audio generation: GOOGLE_API_KEY not set.");
        return { success: false, reason: "NO_API_KEY" };
    }

    const type = options.type || 'default';
    const voiceName = options.voiceName || "Kore";
    const silenceThreshold = options.silenceThreshold || "-30dB";
    const silenceDuration = options.silenceDuration || 0.3;
    const skipUpload = options.skipUpload === true;

    const TEMP_DIR = path.join(BASE_DIR, 'temp', 'audio');
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const batchId = crypto.randomBytes(4).toString('hex');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const folderName = `batch-${dateStr}-${batchId}`;
    const batchOutputDir = path.join(TEMP_DIR, folderName);
    if (!fs.existsSync(batchOutputDir)) fs.mkdirSync(batchOutputDir, { recursive: true });
    const generatedFiles = []; // { text, filename } entries accumulated during this batch

    const combinedWav = path.join(batchOutputDir, `${folderName}_combined.wav`);
    const tempPy = path.join(batchOutputDir, `${folderName}_tts.py`);
    const pyLog = path.join(batchOutputDir, `${folderName}_py.log`);
    const sentencesMd = path.join(batchOutputDir, 'tts-sentences.md');

    const separator = " [BREAK] . . . . . [BREAK] "; 
    
    const sentences = tasks.map(t => t.text || t.context_sentence || t.word || t.en);
    fs.writeFileSync(sentencesMd, sentences.join('\n'), 'utf8');

    const ttsSentences = sentences.map(text => text.replace(/Shenzhou V/g, 'Shenzhou <sub alias="five">V</sub>'));
    // A short warmup sentence is prepended so the TTS model reads every real
    // sentence in "mid-list" position, preventing the first sentence from being
    // repeated as a "heading". The warmup segment is discarded during cutting
    // (startTime is set to the midpoint of silences[0], the silence after warmup).
    // Unlike a leading [BREAK] marker, a spoken word is always reliably generated
    // and its trailing silence falls well past the s.start > 0.1 filter threshold.
    const WARMUP = 'Start.';
    const combinedText = [WARMUP, ...ttsSentences].join(separator) + separator;
    
    console.log(`TTS Batch Request [ID: ${batchId}, Type: ${type}]: ${tasks.length} items.`);

    const pythonScript = `
import os
import wave
import sys
import time
from google import genai
from google.genai import types

client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

def get_tts():
    # Use a highly structured prompt to enforce silences.
    prompt = """Task: Read the following list of sentences one by one.
    
    Strict Rules:
    1. Read ONLY the sentence text.
    2. At every '[BREAK] . . . . . [BREAK]' marker, you MUST remain COMPLETELY SILENT for exactly 4 seconds.
    3. Do NOT say the words 'BREAK', 'bracket', or 'dot'.
    
    Text to read:
    ${combinedText.replace(/"/g, '\\"')}
    """
    
    models = ["gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview"]
    for model_name in models:
        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        responseModalities=["AUDIO"],
                        safetySettings=[
                            types.SafetySetting(
                                category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                                threshold=types.HarmBlockThreshold.BLOCK_NONE,
                            ),
                            types.SafetySetting(
                                category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
                                threshold=types.HarmBlockThreshold.BLOCK_NONE,
                            ),
                            types.SafetySetting(
                                category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                                threshold=types.HarmBlockThreshold.BLOCK_NONE,
                            ),
                            types.SafetySetting(
                                category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                                threshold=types.HarmBlockThreshold.BLOCK_NONE,
                            )
                        ],
                        speechConfig=types.SpeechConfig(
                            voiceConfig=types.VoiceConfig(
                                prebuiltVoiceConfig=types.PrebuiltVoiceConfig(
                                    voiceName="${voiceName}"
                                )
                            )
                        )
                    )
                )
                return response
            except Exception as e:
                err_str = str(e)
                if ("500" in err_str or "Internal Server Error" in err_str) and attempt < max_retries - 1:
                    time.sleep((attempt + 1) * 2)
                    continue
                if "429" in err_str:
                    if model_name == models[0]:
                        print("SWITCHING_TO_3_1")
                        break
                    else:
                        print("MARK_QUOTA_EXHAUSTED")
                        sys.exit(1)
                raise e
    sys.exit(1)

try:
    response = get_tts()
    if not response.candidates or not response.candidates[0].content or not response.candidates[0].content.parts:
        print("Response candidate or content is None. Full response:")
        print(response)
        raise ValueError("Blocked or empty response from Gemini API.")
    with wave.open("${combinedWav}", "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(response.candidates[0].content.parts[0].inline_data.data)
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc(file=sys.stdout)
    sys.exit(1)
`;

    fs.writeFileSync(tempPy, pythonScript);
    
    let quotaExhausted = false;
    let timeoutsCount = 0;
    const MAX_TIMEOUTS = 3;
    let success = false;

    while (timeoutsCount < MAX_TIMEOUTS && !success) {
            try {
                // If this is a retry due to insufficient pauses, delete the old wav to ensure a fresh one
                if (fs.existsSync(combinedWav)) fs.unlinkSync(combinedWav);

                // 60 seconds timeout per attempt
                execSync(`python3 "${tempPy}" > "${pyLog}" 2>&1`, { timeout: 60000 });
                
                const pyOutput = fs.readFileSync(pyLog, 'utf8');
                if (pyOutput.includes("MARK_QUOTA_EXHAUSTED")) quotaExhausted = true;
                if (pyOutput.includes("SWITCHING_TO_3_1")) {
                    console.log("\x1b[36m%s\x1b[1m%s\x1b[22m\x1b[0m", "ℹ️ Gemini 2.5 Flash TTS quota exhausted. Switched to ", "Gemini 3.1 Flash TTS");
                }

                if (tasks.length === 1) {
                    const task = tasks[0];
                    const text = sentences[0];
                    const hash = crypto.createHash('md5').update(text).digest('hex');
                    const segmentFileName = `${hash}.mp3`;
                    const segmentMp3 = path.join(batchOutputDir, segmentFileName);

                    const silenceOutput1 = execSync(`ffmpeg -i "${combinedWav}" -af "agate=threshold=-32dB:ratio=10:range=-60dB,silencedetect=n=${silenceThreshold}:d=2.0" -f null - 2>&1`).toString();
                    const startRe1 = /silence_start: ([\d.]+)/g;
                    const endRe1 = /silence_end: ([\d.]+)/g;
                    const allSilences1 = [];
                    let sm1, em1;
                    while ((sm1 = startRe1.exec(silenceOutput1)) !== null && (em1 = endRe1.exec(silenceOutput1)) !== null) {
                        allSilences1.push({ start: parseFloat(sm1[1]), end: parseFloat(em1[1]) });
                    }
                    // First qualifying silence (start > 0.1s) is the post-warmup gap
                    const leadingSilence1 = allSilences1.find(s => s.start > 0.1);
                    const skipTo = leadingSilence1 ? (leadingSilence1.start + leadingSilence1.end) / 2 : 0;
                    if (skipTo > 0) {
                        console.log(`[Batch: ${batchId}] Single-item warmup skip: seeking to ${skipTo.toFixed(3)}s to discard "Start." warmup.`);
                    }
                    const segmentWav1 = path.join(batchOutputDir, `${hash}_temp.wav`);
                    if (skipTo > 0) {
                        execSync(`ffmpeg -i "${combinedWav}" -ss ${skipTo} -c copy "${segmentWav1}" -y -loglevel error`);
                    }
                    const inputForTrim = skipTo > 0 ? segmentWav1 : combinedWav;
                    execSync(`ffmpeg -i "${inputForTrim}" -af "agate=threshold=-32dB:ratio=10:range=-60dB,silenceremove=start_periods=1:start_threshold=${silenceThreshold},areverse,silenceremove=start_periods=1:start_threshold=${silenceThreshold},areverse,asetpts=N/SR/TB" -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
                    if (fs.existsSync(segmentWav1)) fs.unlinkSync(segmentWav1);
                    
                    const r2Key = `ep/${book}/${hash}.mp3`;
                    let fileStatus = 1;

                    if (skipUpload) {
                        console.log(`[Batch: ${batchId}] --no-upload: skipping R2 upload for ${r2Key}`);
                    } else {
                        let uploadSuccess = false;
                        for (let attempt = 1; attempt <= 3; attempt++) {
                            try {
                                await s3Client.send(new PutObjectCommand({
                                    Bucket: BUCKET_NAME,
                                    Key: r2Key,
                                    Body: fs.readFileSync(segmentMp3),
                                    ContentType: "audio/mpeg",
                                }));
                                uploadSuccess = true;
                                break;
                            } catch (e) {
                                console.warn(`[Batch: ${batchId}] Upload attempt ${attempt} failed for ${r2Key}: ${e.message}`);
                                if (attempt < 3) await new Promise(res => setTimeout(res, 2000));
                            }
                        }
                        if (!uploadSuccess) {
                            fileStatus = 2;
                            console.error(`[Batch: ${batchId}] Failed to upload single audio to R2 after 3 attempts: ${r2Key}`);
                        } else {
                            task.audio = `${PUBLIC_URL_BASE}/${r2Key}`;
                        }
                    }

                    generatedFiles.push({ text, hash, filename: segmentFileName, status: fileStatus });
                    success = true;
                } else {
                    const silenceOutput = execSync(`ffmpeg -i "${combinedWav}" -af "agate=threshold=-32dB:ratio=10:range=-60dB,silencedetect=n=${silenceThreshold}:d=2.0" -f null - 2>&1`).toString();
                    const allSilences = [];
                    const startRe = /silence_start: ([\d.]+)/g;
                    const endRe = /silence_end: ([\d.]+)/g;
                    let sMatch, eMatch;
                    while ((sMatch = startRe.exec(silenceOutput)) !== null && (eMatch = endRe.exec(silenceOutput)) !== null) {
                        allSilences.push({ start: parseFloat(sMatch[1]), end: parseFloat(eMatch[1]) });
                    }
                    const candidateSilences = allSilences.filter(s => s.start > 0.1);
                    
                    // We now expect tasks.length + 1 silences:  1 leading + N trailing (one after each sentence).
                    if (candidateSilences.length < tasks.length) {
                        console.warn(`⚠️ Insufficient pauses detected (${candidateSilences.length}/${tasks.length} required). Retrying attempt ${timeoutsCount + 2}/${MAX_TIMEOUTS}...`);
                        timeoutsCount++;
                        if (timeoutsCount >= MAX_TIMEOUTS) {
                            console.error("❌ CRITICAL: Failed to get enough pauses after 3 attempts. Terminating.");
                            process.exit(1);
                        }
                        continue;
                    }

                    // Select the N+1 longest silences (1 after warmup + N after sentences),
                    // then re-sort by start time for correct cutting order.
                    // Duration-based selection is reliable here because the warmup sentence
                    // guarantees no extra early silence (s.start ≈ 0) can displace a real
                    // boundary — the problem that originally forced the greedy minGap approach.
                    const silencesCount = tasks.length + 1;
                    const silences = candidateSilences
                        .map(s => ({ ...s, duration: s.end - s.start }))
                        .sort((a, b) => b.duration - a.duration)
                        .slice(0, silencesCount)
                        .sort((a, b) => a.start - b.start);

                    console.log(`Detected ${allSilences.length} pauses, using ${silences.length} longest as N+1 separators.`);

                    // 1. Cut Phase: Generate all MP3s locally first
                    const uploadTasks = [];
                    // Start from the midpoint of the leading silence (silences[0]),
                    // then use silences[1..N] as the end boundaries for each sentence.
                    let startTime = silences[0] ? (silences[0].start + silences[0].end) / 2 : 0;
                    for (let i = 0; i < tasks.length; i++) {
                        const task = tasks[i];
                        const text = sentences[i];
                        const hash = crypto.createHash('md5').update(text).digest('hex');
                        const segmentFileName = `${hash}.mp3`;
                        const segmentMp3 = path.join(batchOutputDir, segmentFileName);
                        
                        const s = silences[i + 1]; // silences[0] is the leading silence; [1..N] are inter-sentence
                        const endTime = s ? (s.start + s.end) / 2 : (i === tasks.length - 1 ? 99999 : startTime + 15); 

                        const segmentWav = path.join(batchOutputDir, `${hash}_temp.wav`);
                        execSync(`ffmpeg -i "${combinedWav}" -ss ${startTime} -to ${endTime} -c copy "${segmentWav}" -y -loglevel error`);
                        execSync(`ffmpeg -i "${segmentWav}" -af "agate=threshold=-32dB:ratio=10:range=-60dB,silenceremove=start_periods=1:start_threshold=${silenceThreshold},areverse,silenceremove=start_periods=1:start_threshold=${silenceThreshold},areverse,asetpts=N/SR/TB" -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
                        
                        if (fs.existsSync(segmentWav)) fs.unlinkSync(segmentWav);

                        uploadTasks.push({ task, segmentMp3, hash, text, segmentFileName });
                        startTime = endTime;
                    }

                    // 2. Upload Phase: Upload all prepared MP3s to R2 with retries (Concurrency: 8)
                    if (skipUpload) {
                        console.log(`[Batch: ${batchId}] --no-upload: skipping R2 upload for ${uploadTasks.length} files.`);
                        for (const item of uploadTasks) {
                            generatedFiles.push({ text: item.text, hash: item.hash, filename: item.segmentFileName, status: 1 });
                        }
                    } else {
                        const CONCURRENCY_LIMIT = 8;
                        const results = [];
                        const pool = new Set();

                        for (const item of uploadTasks) {
                            const promise = (async () => {
                                const { task, segmentMp3, hash, text, segmentFileName } = item;
                                const r2Key = `ep/${book}/${hash}.mp3`;
                                console.log(`[Batch: ${batchId}] Uploading to R2: ${r2Key}`);
                                let uploadSuccess = false;
                                for (let attempt = 1; attempt <= 3; attempt++) {
                                    try {
                                        await s3Client.send(new PutObjectCommand({
                                            Bucket: BUCKET_NAME,
                                            Key: r2Key,
                                            Body: fs.readFileSync(segmentMp3),
                                            ContentType: "audio/mpeg",
                                        }));
                                        uploadSuccess = true;
                                        break;
                                    } catch (e) {
                                        console.warn(`[Batch: ${batchId}] Upload attempt ${attempt} failed for ${r2Key}: ${e.message}`);
                                        if (attempt < 3) await new Promise(res => setTimeout(res, 2000));
                                    }
                                }
                                const fileStatus = uploadSuccess ? 1 : 2;
                                if (uploadSuccess) {
                                    task.audio = `${PUBLIC_URL_BASE}/${r2Key}`;
                                } else {
                                    console.error(`[Batch: ${batchId}] Failed to upload ${r2Key} after 3 attempts.`);
                                }
                                generatedFiles.push({ text, hash, filename: segmentFileName, status: fileStatus });
                            })();

                            results.push(promise);
                            pool.add(promise);
                            promise.finally(() => pool.delete(promise));

                            if (pool.size >= CONCURRENCY_LIMIT) {
                                await Promise.race(pool);
                            }
                        }
                        await Promise.all(results);
                    }
                    success = true;
                }
                return { success: true, quotaExhausted, batchId, folderName, files: generatedFiles };
            } catch (err) {
                if (err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM') {
                    timeoutsCount++;
                    console.warn(`⚠️ TTS Attempt timed out (60s). Timeout count: ${timeoutsCount}/${MAX_TIMEOUTS}`);
                    if (timeoutsCount >= MAX_TIMEOUTS) {
                        console.error("❌ CRITICAL: TTS timed out 3 times for the same batch. Terminating process.");
                        process.exit(1);
                    }
                    continue;
                }
                
                const pyOutput = fs.existsSync(pyLog) ? fs.readFileSync(pyLog, 'utf8') : "";
                console.error("Batch TTS processing failed:", err.message);
                if (pyOutput) console.error("Python Output:\n", pyOutput);
                
                return { success: false, reason: "ERROR", error: err.message, quotaExhausted };
            }
    }
    return { success: false, reason: "UNKNOWN_FAILURE" };
}

module.exports = { getAudioBatch };
