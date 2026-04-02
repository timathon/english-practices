import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

// 1. Set up the connection
const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

async function uploadAudio() {
    const fileStream = fs.createReadStream("output.wav");

    const uploadParams = {
        Bucket: "embroid-001",
        Key: "audio/sentence_1.wav", // The name it will have in the bucket
        Body: fileStream,
        ContentType: "audio/wav", // Good practice to set the MIME type
    };

    try {
        console.log("Uploading...");
        await s3Client.send(new PutObjectCommand(uploadParams));
        console.log("Upload complete!");
    } catch (err) {
        console.error("Error uploading file:", err);
    }
}

uploadAudio();