const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

/**
 * Audio Cutter Tool
 * Cuts a combined WAV file into segments based on silence detection logic from vg_release_gen.cjs.
 * 
 * Usage: node scripts/cut-audio.cjs <folder_path> [num_segments]
 * Example: node scripts/cut-audio.cjs temp/audio/batch_010849be
 */

const BASE_DIR = path.resolve(__dirname, '..');

function resolvePath(p) {
    return path.isAbsolute(p) ? p : path.resolve(BASE_DIR, p);
}

function cutAudio(folderPath, requestedNumSegments) {
    const absoluteFolderPath = resolvePath(folderPath);
    if (!fs.existsSync(absoluteFolderPath)) {
        console.error(`❌ Folder not found: ${absoluteFolderPath}`);
        return;
    }

    // Find the combined wav file
    const files = fs.readdirSync(absoluteFolderPath);
    const combinedWav = files.find(f => f.endsWith('_combined.wav'));
    
    if (!combinedWav) {
        console.error(`❌ No combined WAV file found in ${absoluteFolderPath}`);
        return;
    }

    // Detect existing segments to infer count and filenames
    const existingSegments = files
        .filter(f => /^\d{3}_.*\.mp3$/.test(f))
        .sort();
    
    let numSegments = requestedNumSegments || existingSegments.length;
    let segmentNames = existingSegments;

    const combinedWavPath = path.join(absoluteFolderPath, combinedWav);
    console.log(`Processing ${combinedWavPath}...`);

    try {
        // Detect silences using the logic from vg_release_gen.cjs
        const silenceOutput = execSync(`ffmpeg -i "${combinedWavPath}" -af "silencedetect=n=-30dB:d=0.3" -f null - 2>&1`).toString();
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

        if (!numSegments) {
            console.log("No num_segments provided and no existing mp3 files found. Using detected silences count.");
            numSegments = candidateSilences.length;
        }

        const silences = candidateSilences
            .sort((a, b) => b.duration - a.duration)
            .slice(0, numSegments)
            .sort((a, b) => a.start - b.start);

        console.log(`Detected ${allSilences.length} total pauses, using ${silences.length} longest (after filtering ${allSilences.length - candidateSilences.length} leading) as separators.`);

        if (silences.length < numSegments) {
            console.warn(`⚠️ Warning: Only found ${silences.length} silences, but requested/detected ${numSegments} segments.`);
        }

        let startTime = 0;
        for (let i = 0; i < numSegments; i++) {
            let segmentFileName;
            if (segmentNames[i]) {
                segmentFileName = segmentNames[i];
            } else {
                segmentFileName = `segment_${String(i + 1).padStart(3, '0')}.mp3`;
            }
            
            const segmentMp3 = path.join(absoluteFolderPath, segmentFileName);
            const s = silences[i];
            const endTime = s ? (s.start + s.end) / 2 : (startTime + 15); // Fallback if silence not found

            console.log(`  Cutting segment ${i + 1}: ${startTime.toFixed(2)}s to ${endTime.toFixed(2)}s -> ${segmentFileName}`);
            execSync(`ffmpeg -i "${combinedWavPath}" -ss ${startTime} -to ${endTime} -codec:a libmp3lame -qscale:a 2 "${segmentMp3}" -y -loglevel error`);
            
            startTime = endTime;
        }

        console.log(`✅ Successfully cut ${numSegments} segments in ${absoluteFolderPath}`);
    } catch (err) {
        console.error("❌ Audio cutting failed:", err.message);
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('❌ Usage: node scripts/cut-audio.cjs <folder_path> [num_segments]');
    process.exit(1);
}

const folderPath = args[0];
const numSegments = args[1] ? parseInt(args[1]) : null;

if (args[1] && (isNaN(numSegments) || numSegments <= 0)) {
    console.error('❌ Error: num_segments must be a positive integer.');
    process.exit(1);
}

cutAudio(folderPath, numSegments);
