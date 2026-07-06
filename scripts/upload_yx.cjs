const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// R2 Configuration
const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";
const bookName = "w7a";

const outputDir = path.resolve(__dirname, '../temp/audio/yx/output');

async function uploadFiles() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error("❌ Error: AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are not set in environment.");
        process.exit(1);
    }

    if (!fs.existsSync(outputDir)) {
        console.error(`❌ Output directory not found: ${outputDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.mp3') && f !== 'source.mp3');
    console.log(`Found ${files.length} MP3 files to upload to R2 bucket: ${BUCKET_NAME}, path prefix: ep/${bookName}/`);

    for (const file of files) {
        const filePath = path.join(outputDir, file);
        const fileStream = fs.createReadStream(filePath);
        const r2Key = `ep/${bookName}/${file}`;

        console.log(`Uploading ${file} -> ${r2Key}...`);
        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: r2Key,
                Body: fileStream,
                ContentType: 'audio/mpeg'
            }));
            console.log(`✅ Uploaded ${file} successfully.`);
        } catch (err) {
            console.error(`❌ Failed to upload ${file}:`, err);
        }
    }
    console.log("🎉 R2 Upload complete.");
}

uploadFiles();
