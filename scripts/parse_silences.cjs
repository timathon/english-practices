const fs = require('fs');

const content = fs.readFileSync('temp/silences.txt', 'utf8');
const lines = content.split('\n');

const silences = [];
const startRe = /silence_start: ([\d.]+)/;
const endRe = /silence_end: ([\d.]+)\s*\|\s*silence_duration: ([\d.]+)/;

let currentStart = null;

for (const line of lines) {
    const startMatch = line.match(startRe);
    if (startMatch) {
        currentStart = parseFloat(startMatch[1]);
    }
    const endMatch = line.match(endRe);
    if (endMatch && currentStart !== null) {
        silences.push({
            start: currentStart,
            end: parseFloat(endMatch[1]),
            duration: parseFloat(endMatch[2])
        });
        currentStart = null;
    }
}

// Sort by start time
silences.sort((a, b) => a.start - b.start);

console.log('Detected Silences:');
silences.forEach((s, idx) => {
    console.log(`Silence #${idx + 1}: ${s.start.toFixed(2)}s to ${s.end.toFixed(2)}s (duration: ${s.duration.toFixed(2)}s)`);
});

console.log('\nAudio segments (between silences):');
let lastEnd = 0;
silences.forEach((s, idx) => {
    if (s.start > lastEnd) {
        console.log(`Segment #${idx + 1}: ${lastEnd.toFixed(2)}s to ${s.start.toFixed(2)}s (duration: ${(s.start - lastEnd).toFixed(2)}s)`);
    }
    lastEnd = s.end;
});
// Add final segment
const totalDuration = 229.28; // From ffprobe: 3:49.28 = 229.28s
if (lastEnd < totalDuration) {
    console.log(`Segment #${silences.length + 1}: ${lastEnd.toFixed(2)}s to ${totalDuration.toFixed(2)}s (duration: ${(totalDuration - lastEnd).toFixed(2)}s)`);
}
