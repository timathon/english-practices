import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Configure S3 Client for Cloudflare R2
const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = "embroid-001";

async function listFolders() {
    console.log(`Connecting to R2 bucket "${BUCKET_NAME}"...`);
    
    // Check credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error("ERROR: Missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in environment variables.");
        process.exit(1);
    }

    try {
        // Method 1: List top-level folders (using Delimiter '/')
        console.log("\n--- Top-Level Folders (Delimiter: '/') ---");
        const topLevelCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Delimiter: "/",
        });
        const topLevelRes = await s3Client.send(topLevelCommand);
        const topLevelFolders = (topLevelRes.CommonPrefixes || []).map(p => p.Prefix);
        
        if (topLevelFolders.length === 0) {
            console.log("No top-level folders found.");
        } else {
            topLevelFolders.forEach(folder => console.log(`  - ${folder}`));
        }

        // Method 2: List all folders/prefixes recursively by walking all keys
        console.log("\n--- All Unique Folders / Prefixes (Recursive Walk) ---");
        const allFolders = new Set();
        let isTruncated = true;
        let continuationToken = undefined;

        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken,
            });
            const response = await s3Client.send(command);
            
            if (response.Contents) {
                for (const item of response.Contents) {
                    const key = item.Key;
                    if (key.includes("/")) {
                        const parts = key.split("/");
                        // For a key like "audio/a7b/u1/phrase.mp3", extract:
                        // "audio/", "audio/a7b/", "audio/a7b/u1/"
                        let currentPrefix = "";
                        for (let i = 0; i < parts.length - 1; i++) {
                            currentPrefix += parts[i] + "/";
                            allFolders.add(currentPrefix);
                        }
                    }
                }
            }

            isTruncated = response.IsTruncated;
            continuationToken = response.NextContinuationToken;
        }

        const sortedFolders = Array.from(allFolders).sort();
        if (sortedFolders.length === 0) {
            console.log("No nested folders found.");
        } else {
            sortedFolders.forEach(folder => console.log(`  - ${folder}`));
        }
    } catch (err) {
        console.error("Error listing folders:", err);
    }
}

listFolders();
