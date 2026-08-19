#!/usr/bin/env node
/**
 * ZXT Poem Image R2 Uploader
 * 
 * Uploads cropped WebP images from zxt/data/blg/images/cropped/
 * to Cloudflare R2 bucket `embroid-001` with key structure: zxt/blg/${filename}
 * 
 * Usage:
 *   node zxt/scripts/upload_poem_images_r2.js               # upload all cropped images
 *   node zxt/scripts/upload_poem_images_r2.js --id 8        # upload only poem 8 images
 *   node zxt/scripts/upload_poem_images_r2.js 8             # shorthand for poem 8
 *   node zxt/scripts/upload_poem_images_r2.js --range 21-30 # upload poems 21 to 30
 *   node zxt/scripts/upload_poem_images_r2.js 21-30         # shorthand for range 21-30
 *   node zxt/scripts/upload_poem_images_r2.js --start 21 --end 30
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function parseArgs() {
  const args = process.argv.slice(2);
  let targetIds = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--id' && args[i + 1]) {
      const id = parseInt(args[i + 1], 10);
      if (!isNaN(id)) targetIds = new Set([id]);
      i++;
    } else if (arg === '--range' && args[i + 1]) {
      const [start, end] = args[i + 1].split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        targetIds = new Set();
        for (let num = Math.min(start, end); num <= Math.max(start, end); num++) {
          targetIds.add(num);
        }
      }
      i++;
    } else if (arg === '--start' && args[i + 1]) {
      const start = parseInt(args[i + 1], 10);
      let end = start;
      if (args[i + 2] === '--end' && args[i + 3]) {
        end = parseInt(args[i + 3], 10);
        i += 2;
      }
      if (!isNaN(start) && !isNaN(end)) {
        targetIds = new Set();
        for (let num = Math.min(start, end); num <= Math.max(start, end); num++) {
          targetIds.add(num);
        }
      }
      i++;
    } else if (/^\d+-\d+$/.test(arg)) {
      const [start, end] = arg.split('-').map(Number);
      targetIds = new Set();
      for (let num = Math.min(start, end); num <= Math.max(start, end); num++) {
        targetIds.add(num);
      }
    } else if (/^\d+$/.test(arg)) {
      const id = parseInt(arg, 10);
      targetIds = new Set([id]);
    }
  }

  return targetIds;
}

async function uploadImagesToR2() {
  if (!fs.existsSync(CROPPED_DIR)) {
    console.error(`❌ Directory not found: ${CROPPED_DIR}`);
    process.exit(1);
  }

  let files = fs.readdirSync(CROPPED_DIR).filter(f => f.endsWith('.webp'));
  if (files.length === 0) {
    console.log(`⚠️ No .webp files found in ${CROPPED_DIR}`);
    return;
  }

  const targetIds = parseArgs();

  if (targetIds && targetIds.size > 0) {
    files = files.filter(f => {
      const match = f.match(/^p(\d+)_/);
      if (!match) return false;
      const poemId = parseInt(match[1], 10);
      return targetIds.has(poemId);
    });

    const sortedTargets = Array.from(targetIds).sort((a, b) => a - b);
    console.log(`🎯 Target filter active: Poems [${sortedTargets.join(', ')}] (${files.length} image files matched)`);
  }

  if (files.length === 0) {
    console.log(`⚠️ No matching .webp files found for the specified target IDs in ${CROPPED_DIR}`);
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

