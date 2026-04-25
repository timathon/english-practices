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

    const TEMP_DIR = path.join(BASE_DIR, 'temp', 'audio');
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const batchId = crypto.randomBytes(4).toString('hex');
    const batchOutputDir = path.join(TEMP_DIR, `batch_${batchId}`);
    if (!fs.existsSync(batchOutputDir)) fs.mkdirSync(batchOutputDir, { recursive: true });

    const combinedWav = path.join(batchOutputDir, `batch_${batchId}_combined.wav`);
    const tempPy = path.join(TEMP_DIR, `batch_${batchId}_tts.py`);
    const pyLog = path.join(TEMP_DIR, `batch_${batchId}_py.log`);
    const sentencesMd = path.join(batchOutputDir, 'tts-sentences.md');

    const separator = " [BREAK] . . . . . [BREAK] "; 
    
    const sentences = tasks.map(t => t.text || t.context_sentence || t.word || t.en);
    fs.writeFileSync(sentencesMd, sentences.join('\n'), 'utf8');

    const ttsSentences = sentences.map(text => text.replace(/Shenzhou V/g, 'Shenzhou <sub alias="five">V</sub>'));
    const combinedText = ttsSentences.join(separator) + separator;
    
    console.log(`TTS Batch Request [ID: ${batchId}, Type: ${type}]: ${tasks.length} items.`);

    const pythonScript = `
import wave
import sys
import time
from google import genai
from google.genai import types

client = genai.Client(api_key="${process.env.GOOGLE_API_KEY}")

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

    try {
        while (timeoutsCount < MAX_TIMEOUTS && !success) {
            try {
                // 60 seconds timeout per attempt
                execSync(`python3 "${tempPy}" > "${pyLog}" 2>&1`, { timeout: 60000 });
                success = true;
                
                const pyOutput = fs.readFileSync(pyLog, 'utf8');
                if (pyOutput.includes("MARK_QUOTA_EXHAUSTED")) quotaExhausted = true;
                if (pyOutput.includes("SWITCHING_TO_3_1")) {
                    console.log("\x1b[36m%s\x1b[1m%s\x1b[22m\x1b[0m", "ℹ️ Gemini 2.5 Flash TTS quota exhausted. Switched to ", "Gemini 3.1 Flash TTS");
                }

                if (tasks.length === 1) {
                    const task = tasks[0];
                    const text = sentences[0];
                    const hash = crypto.createHash('md5').update(text).digest('hex');
                    const segmentMp3 = path.join(batchOutputDir, `001_single_${hash}.mp3`);
                    
                    execSync(`ffmpeg -i "${combinedWav}" -af "silenceremove=start_periods=1:start_threshold=-35dB,areverse,silenceremove=start_periods=1:start_threshold=-35dB,areverse,asetpts=N/SR/TB" -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
                    
                    const r2Key = `ep/${book}/${hash}.mp3`;
                    await s3Client.send(new PutObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: r2Key,
                        Body: fs.readFileSync(segmentMp3),
                        ContentType: "audio/mpeg",
                    }));
                    task.audio = `${PUBLIC_URL_BASE}/${r2Key}`;
                } else {
                    const silenceOutput = execSync(`ffmpeg -i "${combinedWav}" -af "silencedetect=n=${silenceThreshold}:d=0.8" -f null - 2>&1`).toString();
                    const allSilences = [];
                    const startRe = /silence_start: ([\d.]+)/g;
                    const endRe = /silence_end: ([\d.]+)/g;
                    let sMatch, eMatch;
                    while ((sMatch = startRe.exec(silenceOutput)) !== null && (eMatch = endRe.exec(silenceOutput)) !== null) {
                        allSilences.push({ start: parseFloat(sMatch[1]), end: parseFloat(eMatch[1]) });
                    }
                    const candidateSilences = allSilences.filter(s => s.start > 0.1);
                    
                    if (candidateSilences.length < tasks.length) {
                        console.warn(`⚠️ Insufficient pauses detected (${candidateSilences.length}/${tasks.length}). Retrying...`);
                        timeoutsCount++;
                        if (timeoutsCount >= MAX_TIMEOUTS) {
                            console.error("❌ CRITICAL: Failed to get enough pauses after 3 attempts. Terminating.");
                            process.exit(1);
                        }
                        continue;
                    }

                    const silences = candidateSilences
                        .map(s => ({ ...s, duration: s.end - s.start }))
                        .sort((a, b) => b.duration - a.duration)
                        .slice(0, tasks.length)
                        .sort((a, b) => a.start - b.start);

                    console.log(`Detected ${allSilences.length} pauses (>1.0s), using ${silences.length} longest as separators.`);

                    let startTime = 0;
                    for (let i = 0; i < tasks.length; i++) {
                        const task = tasks[i];
                        const text = sentences[i];
                        const hash = crypto.createHash('md5').update(text).digest('hex');
                        const firstWord = text.split(' ')[0].replace(/[^a-zA-Z]/g, '');
                        const segmentFileName = `${String(i + 1).padStart(3, '0')}_${firstWord}_${hash}.mp3`;
                        const segmentMp3 = path.join(batchOutputDir, segmentFileName);
                        
                        const s = silences[i];
                        const endTime = s ? (s.start + s.end) / 2 : (startTime + 15); 

                        const segmentWav = path.join(batchOutputDir, `${String(i + 1).padStart(3, '0')}_temp.wav`);
                        execSync(`ffmpeg -i "${combinedWav}" -ss ${startTime} -to ${endTime} -c copy "${segmentWav}" -y -loglevel error`);
                        execSync(`ffmpeg -i "${segmentWav}" -af "silenceremove=start_periods=1:start_threshold=-35dB,areverse,silenceremove=start_periods=1:start_threshold=-35dB,areverse,asetpts=N/SR/TB" -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
                        
                        if (fs.existsSync(segmentWav)) fs.unlinkSync(segmentWav);

                        const r2Key = `ep/${book}/${hash}.mp3`;
                        await s3Client.send(new PutObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: r2Key,
                            Body: fs.readFileSync(segmentMp3),
                            ContentType: "audio/mpeg",
                        }));
                        task.audio = `${PUBLIC_URL_BASE}/${r2Key}`;
                        startTime = endTime;
                    }
                }
                return { success: true, quotaExhausted };
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
    } finally {
        if (fs.existsSync(tempPy)) fs.unlinkSync(tempPy);
        if (fs.existsSync(pyLog)) fs.unlinkSync(pyLog);
    }
    return { success: false, reason: "UNKNOWN_FAILURE" };
}

module.exports = { getAudioBatch };
