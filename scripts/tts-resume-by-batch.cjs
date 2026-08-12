/**
 * tts-resume-by-batch.cjs
 * 
 * Usage:
 *   node scripts/tts-resume-by-batch.cjs <path-to-job-json> <batchId>
 * 
 * Example:
 *   node scripts/tts-resume-by-batch.cjs temp/audio/tts-job-20260812-213607.json a7e29344
 */

const fs = require('fs');
const path = require('path');

function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node scripts/tts-resume-by-batch.cjs <path-to-job-json> <batchId>');
        process.exit(1);
    }

    const jobPath = path.resolve(args[0]);
    const targetBatchId = args[1].trim();

    if (!fs.existsSync(jobPath)) {
        console.error(`Error: File not found: ${jobPath}`);
        process.exit(1);
    }

    try {
        const fileContent = fs.readFileSync(jobPath, 'utf8');
        const data = JSON.parse(fileContent);

        if (!data.items || !Array.isArray(data.items)) {
            console.error(`Error: Invalid job file structure in ${jobPath}`);
            process.exit(1);
        }

        let count = 0;
        data.items.forEach(item => {
            if (item && item.batchId === targetBatchId) {
                item.done = 0;
                item.batchId = null;
                item.hash = null;
                delete item.wav;
                delete item.start;
                delete item.end;
                count++;
            }
        });

        fs.writeFileSync(jobPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ Successfully reset ${count} item(s) matching batchId "${targetBatchId}" in ${jobPath}`);
    } catch (err) {
        console.error(`Error processing file: ${err.message}`);
        process.exit(1);
    }
}

main();
