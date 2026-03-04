const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

async function downloadFile(url, targetPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(targetPath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(targetPath, () => {});
            reject(err);
        });
    });
}

async function main() {
    const jsonPath = 'data/A3B/a3b-u1-vocab-guide.json';
    const downloadDir = path.join(__dirname, '..', 'temp', 'audio', 'download');
    
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    const folderName = path.basename(path.dirname(jsonPath)).toLowerCase();
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const vocab = data.unit_vocabulary.slice(0, 10);

    console.log(`Downloading audio for first 10 words in ${jsonPath}...`);

    for (const item of vocab) {
        if (!item.context_sentence) {
            console.warn(`No context sentence for word: ${item.word}`);
            continue;
        }

        const hash = crypto.createHash('md5').update(item.context_sentence).digest('hex');
        const fileName = `${hash}.mp3`;
        const url = `${PUBLIC_URL_BASE}/ep/sa/${folderName}/${fileName}`;
        const targetPath = path.join(downloadDir, fileName);

        if (fs.existsSync(targetPath)) {
            console.log(`Skipping (already exists): ${fileName}`);
            continue;
        }

        try {
            process.stdout.write(`Downloading ${fileName} for "${item.word}"... `);
            await downloadFile(url, targetPath);
            process.stdout.write(`DONE
`);
        } catch (err) {
            process.stdout.write(`FAILED: ${err.message}
`);
        }
    }

    console.log('Finished downloading.');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
