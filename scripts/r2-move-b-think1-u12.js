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
const SOURCE_PREFIXES = ["ep/b-think1-u12-p110-p113/", "ep/b-think1-u12-p114-p119/"];
const DEST_PREFIX = "ep/b-think1-u12/";

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
    console.log(`Starting to move files in R2 bucket "${BUCKET}"...`);
    
    // Check credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error("ERROR: Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in environment variables.");
        process.exit(1);
    }

    for (const srcPrefix of SOURCE_PREFIXES) {
        console.log(`\n📂 Processing source folder ${srcPrefix}...`);
        const keys = await listAll(srcPrefix);
        console.log(`   Found ${keys.length} files`);

        for (const key of keys) {
            const filename = key.replace(srcPrefix, "");
            if (!filename) continue; // skip folder marker
            const destKey = DEST_PREFIX + filename;

            console.log(`   Moving: ${key} → ${destKey}`);

            // Copy
            await s3Client.send(new CopyObjectCommand({
                Bucket: BUCKET,
                CopySource: `${BUCKET}/${key}`,
                Key: destKey,
            }));

            // Delete original
            await s3Client.send(new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: key,
            }));
        }
    }
    console.log(`\n🎉 Done! All files from source folders moved to ${DEST_PREFIX}`);
}

main().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
