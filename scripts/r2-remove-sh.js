import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET = "embroid-001";
const PREFIX = "ep/sh/";

async function listAll(prefix) {
    const keys = [];
    let token;
    do {
        const res = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: prefix,
            ContinuationToken: token,
        }));
        if (res.Contents) keys.push(...res.Contents.map(o => o.Key));
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return keys;
}

async function main() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error("ERROR: Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in environment variables.");
        process.exit(1);
    }

    console.log(`Listing files under "${PREFIX}" in bucket "${BUCKET}"...`);
    const keys = await listAll(PREFIX);
    console.log(`Found ${keys.length} files to delete.`);

    if (keys.length === 0) {
        console.log("No files to delete. Done.");
        return;
    }

    const batchSize = 100;
    for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        console.log(`Deleting batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(keys.length / batchSize)}...`);

        const objects = batch.map(key => ({ Key: key }));
        await s3Client.send(new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: objects }
        }));

        batch.forEach(key => console.log(`  Deleted: ${key}`));
    }

    console.log(`\n🎉 Done! All files under "${PREFIX}" deleted.`);
}

main().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
