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

async function uploadFile(fileName, r2Key) {
    const filePath = path.join(__dirname, 'examples', fileName);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }
    const fileBuffer = fs.readFileSync(filePath);
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: "audio/mpeg",
    }));
    console.log(`Uploaded ${fileName} to ${r2Key}`);
}

async function run() {
    await uploadFile('correct.mp3', 'ep/sfx/correct.mp3');
    await uploadFile('error.mp3', 'ep/sfx/error.mp3');
}

run().catch(console.error);
