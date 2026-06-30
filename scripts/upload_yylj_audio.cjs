const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = "embroid-001";
const outputDir = path.resolve(__dirname, '../temp/audio/yylj/output');
const book = "w9a";

async function main() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error("❌ Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in the environment.");
        process.exit(1);
    }

    if (!fs.existsSync(outputDir)) {
        console.error(`❌ Error: Output directory not found: ${outputDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp3') && f !== 'source.mp3');
    console.log(`Found ${files.length} audio files to upload to R2...`);

    for (const file of files) {
        const filePath = path.join(outputDir, file);
        const r2Key = `ep/${book}/${file}`;

        console.log(`Uploading ${file} -> ${r2Key}...`);
        
        let success = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await s3Client.send(new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: r2Key,
                    Body: fs.readFileSync(filePath),
                    ContentType: "audio/mpeg",
                }));
                success = true;
                break;
            } catch (e) {
                console.warn(`  Attempt ${attempt} failed: ${e.message}`);
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        if (!success) {
            console.error(`❌ Failed to upload ${file} after 3 attempts.`);
            process.exit(1);
        }
    }

    console.log("\n🎉 All hashed audio files have been successfully uploaded to R2!");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
