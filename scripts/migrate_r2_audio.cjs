const { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require('crypto');

/**
 * Migration script for R2 audio files.
 * Moves files from ep/{type}/{book}/{unit}/{hash}.mp3 or ep/{type}/{book}/{hash}.mp3
 * to ep/{book}/{hash}.mp3.
 * 
 * Skips ep/sfx/ folder.
 */

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = "embroid-001";

async function migrate() {
    console.log("Starting migration (Concurrent: 10)...");
    let continuationToken;
    let movedCount = 0;
    let errorCount = 0;
    const CONCURRENCY = 10;

    try {
        do {
            const listCommand = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: "ep/",
                ContinuationToken: continuationToken
            });

            const listResponse = await s3Client.send(listCommand);
            if (!listResponse.Contents) break;

            const tasks = [];
            for (const obj of listResponse.Contents) {
                const key = obj.Key;
                if (key.startsWith("ep/sfx/")) continue;

                const match = key.match(/^ep\/(sa|sh|vg|vm)\/([^/]+)\/(?:([^/]+)\/)?([^/]+\.mp3)$/);
                if (match) {
                    const book = match[2];
                    const filename = match[4];
                    const newKey = `ep/${book}/${filename}`;
                    if (key === newKey) continue;

                    tasks.push({ oldKey: key, newKey: newKey });
                }
            }

            // Process tasks in chunks of CONCURRENCY
            for (let i = 0; i < tasks.length; i += CONCURRENCY) {
                const chunk = tasks.slice(i, i + CONCURRENCY);
                await Promise.all(chunk.map(async (task) => {
                    console.log(`Moving: ${task.oldKey} -> ${task.newKey}`);
                    try {
                        await s3Client.send(new CopyObjectCommand({
                            Bucket: BUCKET_NAME,
                            CopySource: encodeURIComponent(`${BUCKET_NAME}/${task.oldKey}`),
                            Key: task.newKey,
                        }));
                        await s3Client.send(new DeleteObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: task.oldKey,
                        }));
                        movedCount++;
                    } catch (err) {
                        console.error(`  Failed to move ${task.oldKey}:`, err.message);
                        errorCount++;
                    }
                }));
            }

            continuationToken = listResponse.NextContinuationToken;
        } while (continuationToken);

        console.log(`\nMigration finished.`);
        console.log(`Total moved: ${movedCount}`);
        console.log(`Total errors: ${errorCount}`);

    } catch (err) {
        console.error("Migration failed with fatal error:", err.message);
    }
}

migrate();
