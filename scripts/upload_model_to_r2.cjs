/**
 * upload_model_to_r2.cjs
 *
 * Downloads quantized Wav2Vec2 phoneme model files from HuggingFace
 * and uploads them to Cloudflare R2 under ep/models/wav2vec2-phoneme/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { S3Client, HeadObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";
const R2_PREFIX = "ep/models/wav2vec2-phoneme";
const PUBLIC_URL_BASE = "https://pub-eb040e4eac0d4c10a0afdebfe07b2fd0.r2.dev";

const MODEL_FILES = [
    {
        filename: "model_quantized.onnx",
        url: "https://huggingface.co/onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX/resolve/main/onnx/model_quantized.onnx"
    },
    {
        filename: "config.json",
        url: "https://huggingface.co/onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX/resolve/main/config.json"
    },
    {
        filename: "preprocessor_config.json",
        url: "https://huggingface.co/onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX/resolve/main/preprocessor_config.json"
    },
    {
        filename: "tokenizer_config.json",
        url: "https://huggingface.co/onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX/resolve/main/tokenizer_config.json"
    },
    {
        filename: "vocab.json",
        url: "https://huggingface.co/onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX/resolve/main/vocab.json"
    }
];

function downloadFile(urlStr, destPath) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(urlStr);
        https.get(parsedUrl, (response) => {
            if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                let redirectUrl = response.headers.location;
                if (redirectUrl.startsWith('/')) {
                    redirectUrl = `${parsedUrl.protocol}//${parsedUrl.host}${redirectUrl}`;
                }
                return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download ${urlStr}: HTTP ${response.statusCode}`));
            }
            const file = fs.createWriteStream(destPath);
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve());
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

async function uploadMultipart(localPath, r2Key) {
    const fileSize = fs.statSync(localPath).size;

    // For small files (< 5MB), use standard PutObject
    if (fileSize < 5 * 1024 * 1024) {
        const fileContent = fs.readFileSync(localPath);
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: r2Key,
            Body: fileContent,
            ContentType: r2Key.endsWith('.onnx') ? 'application/octet-stream' : 'application/json',
        }));
        console.log(`✅ Uploaded small file ${r2Key}`);
        return;
    }

    const chunkSize = 10 * 1024 * 1024; // 10MB parts
    const totalParts = Math.ceil(fileSize / chunkSize);

    console.log(`Starting multipart upload for ${r2Key} (${(fileSize / 1024 / 1024).toFixed(2)} MB, ${totalParts} parts)...`);

    const createRes = await s3Client.send(new CreateMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: r2Key,
        ContentType: r2Key.endsWith('.onnx') ? 'application/octet-stream' : 'application/json',
    }));
    const uploadId = createRes.UploadId;

    const parts = [];
    const buffer = Buffer.alloc(chunkSize);
    const fd = fs.openSync(localPath, 'r');

    try {
        for (let i = 0; i < totalParts; i++) {
            const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, i * chunkSize);
            const partBuffer = buffer.subarray(0, bytesRead);

            const uploadPartRes = await s3Client.send(new UploadPartCommand({
                Bucket: BUCKET_NAME,
                Key: r2Key,
                UploadId: uploadId,
                PartNumber: i + 1,
                Body: partBuffer,
            }));

            parts.push({
                ETag: uploadPartRes.ETag,
                PartNumber: i + 1,
            });

            const pct = (((i + 1) / totalParts) * 100).toFixed(1);
            process.stdout.write(`\r⬆️ Progress: ${pct}% (Part ${i + 1}/${totalParts})`);
        }

        await s3Client.send(new CompleteMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: r2Key,
            UploadId: uploadId,
            MultipartUpload: { Parts: parts },
        }));
        console.log("\n✅ Multipart upload complete!");
    } catch (err) {
        fs.closeSync(fd);
        throw err;
    }
    fs.closeSync(fd);
}

async function main() {
    console.log("Checking model files on Cloudflare R2...");
    const tempDir = path.resolve(__dirname, '../temp/model_downloads');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    for (const item of MODEL_FILES) {
        const r2Key = `${R2_PREFIX}/${item.filename}`;
        try {
            const headRes = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key }));
            if (headRes.ContentLength && headRes.ContentLength > 0) {
                console.log(`✅ Already exists on R2 (${headRes.ContentLength} bytes): ${PUBLIC_URL_BASE}/${r2Key}`);
                continue;
            }
        } catch (e) {
            console.log(`⬇️ File missing on R2: ${item.filename}`);
        }

        const localPath = path.join(tempDir, item.filename);
        if (!fs.existsSync(localPath)) {
            console.log(`Downloading ${item.filename}...`);
            await downloadFile(item.url, localPath);
        }

        await uploadMultipart(localPath, r2Key);
        console.log(`🚀 Uploaded: ${PUBLIC_URL_BASE}/${r2Key}`);

        // Cleanup local file
        fs.unlinkSync(localPath);
    }
    console.log("🎉 All model files are synced on Cloudflare R2!");
}

main().catch(console.error);
