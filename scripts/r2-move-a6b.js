import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET = "embroid-001";
const SOURCE_PREFIXES = [
    "ep/a6b-m1/",
    "ep/a6b-m2/",
    "ep/a6b-m3/",
    "ep/a6b-m4/",
    "ep/a6b-m5/",
    "ep/a6b-m6/",
    "ep/a6b-m7/",
    "ep/a6b-m8/",
    "ep/a6b-m9/",
    "ep/a6b-m10/",
];
const DEST_PREFIX = "ep/a6b/";

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

    console.log(`Starting to move files from a6b/m1..10 to a6b/...`);

    for (const sourcePrefix of SOURCE_PREFIXES) {
        console.log(`\n📂 Processing source prefix: "${sourcePrefix}"`);
        const keys = await listAll(sourcePrefix);
        const filesToMove = keys.filter(key => key !== sourcePrefix); // Skip prefix marker if present
        console.log(`Found ${filesToMove.length} files to move for ${sourcePrefix}`);

        const batchSize = 20;
        for (let i = 0; i < filesToMove.length; i += batchSize) {
            const batch = filesToMove.slice(i, i + batchSize);
            console.log(`  📦 Processing batch ${Math.floor(i / batchSize) + 1} / ${Math.ceil(filesToMove.length / batchSize)} (indices ${i} to ${i + batch.length - 1})...`);

            // Perform copies in parallel for this batch
            const copyPromises = batch.map(key => {
                const filename = key.replace(sourcePrefix, "");
                const destKey = DEST_PREFIX + filename;
                return s3Client.send(new CopyObjectCommand({
                    Bucket: BUCKET,
                    CopySource: `${BUCKET}/${key}`,
                    Key: destKey,
                })).then(() => {
                    console.log(`    Copied: ${key} -> ${destKey}`);
                });
            });

            await Promise.all(copyPromises);
            console.log(`    All copies in batch succeeded.`);

            // Perform deletes in parallel for this batch
            const deletePromises = batch.map(key => {
                return s3Client.send(new DeleteObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                })).then(() => {
                    console.log(`    Deleted original: ${key}`);
                });
            });

            await Promise.all(deletePromises);
            console.log(`    All deletes in batch succeeded.`);
        }
    }

    console.log(`\n🎉 Done! All files moved successfully.`);
}

main().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
