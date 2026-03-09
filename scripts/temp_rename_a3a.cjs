const { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = "embroid-001";

async function renameFolder() {
    console.log("Renaming ep/a3a-1/ to ep/a3a/ (Concurrent: 10)...");
    let continuationToken;
    let movedCount = 0;
    const CONCURRENCY = 10;

    try {
        do {
            const listCommand = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: "ep/a3a-1/",
                ContinuationToken: continuationToken
            });

            const listResponse = await s3Client.send(listCommand);
            if (!listResponse.Contents) break;

            const tasks = listResponse.Contents.map(obj => {
                const oldKey = obj.Key;
                const newKey = oldKey.replace("ep/a3a-1/", "ep/a3a/");
                return { oldKey, newKey };
            });

            for (let i = 0; i < tasks.length; i += CONCURRENCY) {
                const chunk = tasks.slice(i, i + CONCURRENCY);
                await Promise.all(chunk.map(async (task) => {
                    console.log(`Moving: ${task.oldKey} -> ${task.newKey}`);
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
                }));
            }

            continuationToken = listResponse.NextContinuationToken;
        } while (continuationToken);

        console.log(`\nFinished. Total moved: ${movedCount}`);
    } catch (err) {
        console.error("Failed:", err.message);
    }
}

renameFolder();
