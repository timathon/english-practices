const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputWav = 'temp/audio/batch_9d20413c_combined.wav';
const outputDir = 'temp/cut_test';
const wordCount = 5;

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

function tryCut(noise, duration) {
    console.log(`\nTesting with noise=${noise}dB, duration=${duration}s`);
    const silenceOutput = execSync(`ffmpeg -i "${inputWav}" -af "silencedetect=n=${noise}dB:d=${duration}" -f null - 2>&1`).toString();
    
    const allSilences = [];
    const startRe = /silence_start: ([\d.]+)/g;
    const endRe = /silence_end: ([\d.]+)/g;
    let sMatch, eMatch;
    while ((sMatch = startRe.exec(silenceOutput)) !== null && (eMatch = endRe.exec(silenceOutput)) !== null) {
        const start = parseFloat(sMatch[1]);
        const end = parseFloat(eMatch[1]);
        allSilences.push({ start, end, duration: end - start });
    }

    console.log(`Detected ${allSilences.length} silences.`);

    // We want the longest silences which should be our separators
    const silences = allSilences
        .sort((a, b) => b.duration - a.duration)
        .slice(0, wordCount)
        .sort((a, b) => a.start - b.start);

    console.log(`Selected ${silences.length} separator silences.`);

    let startTime = 0;
    for (let i = 0; i < silences.length; i++) {
        const s = silences[i];
        const endTime = (s.start + s.end) / 2;
        const outPath = path.join(outputDir, `word_${i+1}.mp3`);
        
        console.log(`Cutting segment ${i+1}: ${startTime.toFixed(2)} to ${endTime.toFixed(2)} (duration: ${(endTime-startTime).toFixed(2)}s)`);
        
        try {
            // Using a simpler ffmpeg command first
            execSync(`ffmpeg -i "${inputWav}" -ss ${startTime} -to ${endTime} -codec:a libmp3lame -qscale:a 2 "${outPath}" -y -loglevel error`);
            const stats = fs.statSync(outPath);
            console.log(`  Result: ${stats.size} bytes`);
        } catch (e) {
            console.error(`  Error cutting ${i+1}: ${e.message}`);
        }
        
        startTime = endTime;
    }
}

// Based on the grep output, many silences were around 0.4s-0.5s, 
// and the longer ones were ~0.9s.
// Let's try d=0.7 to pick only the separators.
tryCut(-30, 0.3);
