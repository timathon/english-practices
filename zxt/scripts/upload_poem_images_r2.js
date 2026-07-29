#!/usr/bin/env node
/**
 * ZXT Poem Image R2 Uploader
 * 
 * Uploads all cropped WebP images from zxt/data/blg/images/cropped/
 * to Cloudflare R2 bucket `embroid-001` with key structure: zxt/blg/${filename}
 * 
 * Usage: node zxt/scripts/upload_poem_images_r2.js
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Cloudflare R2 Configuration
const s3Client = new S3Client({
  region: 'auto',
  endpoint: 'https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = 'embroid-001';
const CROPPED_DIR = path.resolve(__dirname, '../data/blg/images/cropped');
const R2_PREFIX = 'zxt/blg';

async function uploadImagesToR2() {
  if (!fs.existsSync(CROPPED_DIR)) {
    console.error(`❌ Directory not found: ${CROPPED_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(CROPPED_DIR).filter(f => f.endsWith('.webp'));
  if (files.length === 0) {
    console.log(`⚠️ No .webp files found in ${CROPPED_DIR}`);
    return;
  }

  console.log(`\n🚀 Uploading ${files.length} poem images to R2 bucket "${BUCKET_NAME}" (key: ${R2_PREFIX}/*)...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const filename of files) {
    const filePath = path.join(CROPPED_DIR, filename);
    const r2Key = `${R2_PREFIX}/${filename}`;

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2Key,
        Body: fs.readFileSync(filePath),
        ContentType: 'image/webp',
      }));
      console.log(`  ✓ Uploaded: ${r2Key}`);
      successCount++;
    } catch (err) {
      console.error(`  ✕ Failed to upload ${filename}: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n🎉 Upload Complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed:  ${failCount}\n`);
}

uploadImagesToR2();
