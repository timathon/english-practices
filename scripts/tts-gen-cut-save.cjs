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
 * Common TTS Generation, Silence Cutting, and R2 Saving Module
 * 
 * @param {Array} tasks - Array of objects, each containing text to synthesize.
 * @param {string} book - Book identifier for R2 path (e.g., "A5B").
 * @param {Object} options - Optional parameters: type, voiceName, silenceThreshold, silenceDuration.
 * @returns {Promise<Object>} - { success: boolean, quotaExhausted: boolean }
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

    const separator = " . . . . . "; 
    
    // Normalize tasks to extract text
    const sentences = tasks.map(t => t.text || t.context_sentence || t.word || t.en);
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
    max_retries = 5
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash-preview-tts",
                contents="Say clearly: ${combinedText.replace(/"/g, '\\"')}",
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
                wait_time = (attempt + 1) * 2
                print(f"Retrying after 500 error (attempt {attempt + 1}/{max_retries})...", file=sys.stderr)
                time.sleep(wait_time)
                continue
            if "429" in err_str: print("MARK_QUOTA_EXHAUSTED")
            print(f"FAILED: {err_str}", file=sys.stderr)
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
    let quotaExhausted = false;
    try {
        const pyOutput = execSync(`python3 "${tempPy}"`).toString();
        if (pyOutput.includes("MARK_QUOTA_EXHAUSTED")) quotaExhausted = true;

        if (tasks.length === 1) {
            const task = tasks[0];
            const text = sentences[0];
            const hash = crypto.createHash('md5').update(text).digest('hex');
            const segmentMp3 = path.join(batchOutputDir, `001_single_${hash}.mp3`);
            
            execSync(`ffmpeg -i "${combinedWav}" -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
            
            const r2Key = `ep/${book}/${hash}.mp3`;
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: r2Key,
                Body: fs.readFileSync(segmentMp3),
                ContentType: "audio/mpeg",
            }));
            
            task.audio = `${PUBLIC_URL_BASE}/${r2Key}`;
        } else {
            const silenceOutput = execSync(`ffmpeg -i "${combinedWav}" -af "silencedetect=n=${silenceThreshold}:d=${silenceDuration}" -f null - 2>&1`).toString();
            const allSilences = [];
            const startRe = /silence_start: ([\d.]+)/g;
            const endRe = /silence_end: ([\d.]+)/g;
            let sMatch, eMatch;
            while ((sMatch = startRe.exec(silenceOutput)) !== null && (eMatch = endRe.exec(silenceOutput)) !== null) {
                allSilences.push({ start: parseFloat(sMatch[1]), end: parseFloat(eMatch[1]) });
            }

            // Filter out leading silence (starting within first 0.1s)
            const candidateSilences = allSilences.filter(s => s.start > 0.1);

            const silences = candidateSilences
                .map(s => ({ ...s, duration: s.end - s.start }))
                .sort((a, b) => b.duration - a.duration)
                .slice(0, tasks.length)
                .sort((a, b) => a.start - b.start);

            console.log(`Detected ${allSilences.length} total pauses, using ${silences.length} longest as separators.`);

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

                execSync(`ffmpeg -i "${combinedWav}" -ss ${startTime} -to ${endTime} -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
                
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
        console.error("Batch TTS processing failed:", err.message);
        return { success: false, reason: "ERROR", error: err.message };
    } finally {
        if (fs.existsSync(tempPy)) fs.unlinkSync(tempPy);
    }
}

module.exports = { getAudioBatch };
