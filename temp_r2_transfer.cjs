const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";

async function deletePrefix(prefix) {
    console.log(`Deleting objects with prefix ${prefix}...`);
    let isTruncated = true;
    let continuationToken;

    while (isTruncated) {
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        });

        const response = await s3Client.send(listCommand);
        if (!response.Contents || response.Contents.length === 0) {
            console.log(`  No objects found with prefix ${prefix}`);
            break;
        }

        for (const item of response.Contents) {
            const key = item.Key;
            console.log(`  Deleting: ${key}`);
            await s3Client.send(new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            }));
        }

        isTruncated = response.IsTruncated;
        continuationToken = response.NextContinuationToken;
    }
    console.log(`Finished deleting ${prefix}\n`);
}

async function run() {
    try {
        await deletePrefix("ep/A3B/");
        await deletePrefix("ep/A5B/");
        console.log("🚀 Original uppercase folders deleted successfully.");
    } catch (err) {
        console.error("❌ Deletion failed:", err);
    }
}

run();
