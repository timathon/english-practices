const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");

const BASE_DIR = path.resolve(__dirname, '..');

// R2 Configuration (Sync with generator scripts)
const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";

async function askQuestion(query) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function main() {
    let batchId = process.argv[2];
    if (!batchId) {
        batchId = await askQuestion("Enter batch ID (e.g., af0524b1): ");
    }

    if (!batchId) {
        console.error("❌ Batch ID is required.");
        process.exit(1);
    }

    const batchDir = path.join(BASE_DIR, 'temp', 'audio', `batch_${batchId}`);
    if (!fs.existsSync(batchDir)) {
        console.error(`❌ Batch directory not found: ${batchDir}`);
        process.exit(1);
    }

    // 1. Collect hashes from local files
    const localFiles = fs.readdirSync(batchDir).filter(f => f.endsWith('.mp3'));
    const hashes = localFiles.map(f => {
        const match = f.match(/_([a-f0-9]{32})\.mp3$/);
        return match ? match[1] : null;
    }).filter(h => h !== null);

    if (hashes.length === 0) {
        console.error("❌ No MP3 files with valid hashes found in the batch folder.");
        process.exit(1);
    }

    console.log(`🔍 Found ${hashes.length} files in batch ${batchId}. Searching R2...`);

    // 2. Find full R2 keys for these hashes
    const keysToDelete = [];
    let continuationToken = undefined;

    try {
        do {
            const listCommand = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: 'ep/',
                ContinuationToken: continuationToken
            });

            const response = await s3Client.send(listCommand);
            if (response.Contents) {
                for (const obj of response.Contents) {
                    const basename = path.basename(obj.Key);
                    const hashMatch = basename.match(/^([a-f0-9]{32})\.mp3$/);
                    if (hashMatch && hashes.includes(hashMatch[1])) {
                        keysToDelete.push({ Key: obj.Key });
                    }
                }
            }
            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
    } catch (err) {
        console.error("❌ Error listing objects in R2:", err.message);
        process.exit(1);
    }

    if (keysToDelete.length === 0) {
        console.log("⚠️ No matching files found in R2.");
        return;
    }

    console.log(`\nFound ${keysToDelete.length} files to delete in R2:`);
    keysToDelete.forEach(k => console.log(` - ${k.Key}`));

    const confirm = await askQuestion(`\nAre you sure you want to delete these ${keysToDelete.length} files from R2? (y/N): `);
    if (confirm.toLowerCase() !== 'y') {
        console.log("Operation cancelled.");
        return;
    }

    // 3. Delete from R2
    try {
        for (let i = 0; i < keysToDelete.length; i += 1000) {
            const chunk = keysToDelete.slice(i, i + 1000);
            await s3Client.send(new DeleteObjectsCommand({
                Bucket: BUCKET_NAME,
                Delete: { Objects: chunk }
            }));
        }
        console.log(`✅ Successfully deleted ${keysToDelete.length} files from R2.`);
    } catch (err) {
        console.error("❌ Error deleting files from R2:", err.message);
    }
}

main().catch(console.error);
