const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const BASE_DIR = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(BASE_DIR, 'temp');
const AUDIO_DIR = path.join(TEMP_DIR, 'audio');
const INPUT_FILE = path.join(TEMP_DIR, 'temp-sentences');

if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

async function run() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file not found: ${INPUT_FILE}`);
        console.log('Please create the file and put one sentence per line.');
        return;
    }

    if (!process.env.GOOGLE_API_KEY) {
        console.error("❌ GOOGLE_API_KEY environment variable is not set.");
        return;
    }

    const sentences = fs.readFileSync(INPUT_FILE, 'utf8')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (sentences.length === 0) {
        console.error("❌ No sentences found in the input file.");
        return;
    }

    const batchId = crypto.randomBytes(4).toString('hex');
    const combinedWav = path.join(AUDIO_DIR, `batch_${batchId}_combined.wav`);
    const tempPy = path.join(TEMP_DIR, `batch_${batchId}_tts.py`);

    const separator = " . . . . . "; 
    const combinedText = sentences.join(separator) + separator;
    const totalWords = combinedText.trim().split(/\s+/).length;
    
    console.log(`Processing ${sentences.length} sentences. Total words: ${totalWords}.`);
    console.log(`Sending batch request to Gemini TTS...`);

    const pythonScript = `
import wave
import sys
import json
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
    
    if not response.candidates or not response.candidates[0].content:
        print("❌ ERROR: No candidates or content in response.")
        print(f"Response: {response}")
        sys.exit(1)

    audio_data = None
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            audio_data = part.inline_data.data
            break
            
    if not audio_data:
        print("❌ ERROR: No audio data found in response parts.")
        print(f"Response: {response}")
        sys.exit(1)

    with wave.open("${combinedWav}", "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(audio_data)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}", file=sys.stderr)
    sys.exit(1)
`;

    fs.writeFileSync(tempPy, pythonScript);
    
    try {
        execSync(`python3 "${tempPy}"`);
        console.log(`✅ Combined audio saved to: ${combinedWav}`);

        console.log("Detecting silences for splitting...");
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

        // Robust logic: Only keep the N longest silences, where N is the number of sentences.
        // Mid-sentence pauses (commas) are much shorter than our " . . . . . " separator.
        const silences = allSilences
            .sort((a, b) => b.duration - a.duration) // Sort by duration descending
            .slice(0, sentences.length)              // Take top N
            .sort((a, b) => a.start - b.start);      // Sort back to chronological order

        console.log(`Detected ${allSilences.length} total pauses, using the ${silences.length} longest as separators.`);

        let startTime = 0;
        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            const hash = crypto.createHash('md5').update(sentence).digest('hex');
            // Rule: MD5 hash of the sentence text
            const segmentMp3 = path.join(AUDIO_DIR, `${hash}.mp3`);
            
            const s = silences[i];
            const endTime = s ? (s.start + s.end) / 2 : (startTime + 10);

            execSync(`ffmpeg -i "${combinedWav}" -ss ${startTime} -to ${endTime} -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
            
            console.log(`  [${i+1}/${sentences.length}] Generated: ${path.basename(segmentMp3)}`);
            startTime = endTime;
        }

        console.log(`\n🎉 All files processed successfully in ${AUDIO_DIR}`);

    } catch (err) {
        console.error("❌ Processing failed:", err.message);
    } finally {
        if (fs.existsSync(tempPy)) fs.unlinkSync(tempPy);
    }
}

run();
