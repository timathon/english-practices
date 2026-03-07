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

async function getAudioBatch(tasks, book, unit, type = '') {
    if (tasks.length === 0) return;
    if (!process.env.GOOGLE_API_KEY) {
        console.warn("Skipping audio generation: GOOGLE_API_KEY not set.");
        return;
    }

    const TEMP_DIR = path.join(BASE_DIR, 'temp', 'audio');
    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const batchId = crypto.randomBytes(4).toString('hex');
    const combinedWav = path.join(TEMP_DIR, `batch_${batchId}_combined.wav`);
    const tempPy = path.join(TEMP_DIR, `batch_${batchId}_tts.py`);
    const batchOutputDir = path.join(TEMP_DIR, batchId);
    if (!fs.existsSync(batchOutputDir)) fs.mkdirSync(batchOutputDir, { recursive: true });

    let separator, groups, silenceDuration;

    if (type === 'sh') {
        separator = " . . . . . . . . . . "; 
        groups = tasks.map(t => t.word || t.en || t.text);
        silenceDuration = 0.3;
    } else {
        separator = " . . . . . "; 
        groups = tasks.map(t => t.word || t.en || t.text);
        silenceDuration = 0.3;
    }

    const combinedText = groups.join(separator) + separator + " . . . . . ";
    
    console.log(`TTS Batch Request [ID: ${batchId}, Type: ${type || 'default'}]: ${tasks.length} items.`);

    const pythonScript = `
import wave
import sys
from google import genai
from google.genai import types

client = genai.Client(api_key="${process.env.GOOGLE_API_KEY}")
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
    with wave.open("${combinedWav}", "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(response.candidates[0].content.parts[0].inline_data.data)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}", file=sys.stderr)
    sys.exit(1)
`;

    fs.writeFileSync(tempPy, pythonScript);
    try {
        execSync(`python3 "${tempPy}"`);

        const silenceOutput = execSync(`ffmpeg -i "${combinedWav}" -af "silencedetect=n=-30dB:d=${silenceDuration}" -f null - 2>&1`).toString();
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

        console.log(`Detected ${allSilences.length} total pauses, using ${silences.length} longest (after filtering ${allSilences.length - candidateSilences.length} leading) as separators.`);

        let startTime = 0;
        for (let i = 0; i < tasks.length; i++) {
            const item = tasks[i];
            const wordText = item.word || item.en || item.text || `item_${i+1}`;
            const hash = crypto.createHash('md5').update(wordText).digest('hex');
            
            // Internal filename: order_word_hash.mp3
            const segmentFileName = `${String(i+1).padStart(3, '0')}_${wordText.replace(/\s+/g, '_').substring(0, 20)}_${hash}.mp3`;
            const segmentMp3 = path.join(batchOutputDir, segmentFileName);
            
            const s = silences[i];
            const endTime = s ? (s.start + s.end) / 2 : (startTime + 15);

            // Removed silenceremove filter which was likely causing empty 237B files
            execSync(`ffmpeg -i "${combinedWav}" -ss ${startTime} -to ${endTime} -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
            
            const r2Key = `ep/sh/${book}/${unit}/${hash}.mp3`;
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: r2Key,
                Body: fs.readFileSync(segmentMp3),
                ContentType: "audio/mpeg",
            }));
            
            item.audio = `${PUBLIC_URL_BASE}/${r2Key}`;
            startTime = endTime;
            console.log(`  Processed [${i+1}/${tasks.length}]: ${wordText}`);
        }
    } catch (err) {
        console.error("Batch TTS processing failed:", err.message);
    }
}

module.exports = { getAudioBatch };
