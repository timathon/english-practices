const { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET = "embroid-001";

const SOURCE_PREFIXES = ["ep/a3b-u2/", "ep/a3b-u3/", "ep/a3b-u4/", "ep/a3b-u6/"];
const DEST_PREFIX = "ep/a3b/";

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
    for (const srcPrefix of SOURCE_PREFIXES) {
        console.log(`\n📂 Processing ${srcPrefix}...`);
        const keys = await listAll(srcPrefix);
        console.log(`   Found ${keys.length} files`);

        for (const key of keys) {
            const filename = key.replace(srcPrefix, "");
            if (!filename) continue; // skip folder marker
            const destKey = DEST_PREFIX + filename;

            process.stdout.write(`   ${key} → ${destKey} ... `);

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

            console.log("✅");
        }
    }
    console.log("\n🎉 Done! All files moved to ep/a3b/");
}

main().catch(err => { console.error("❌ Error:", err); process.exit(1); });
