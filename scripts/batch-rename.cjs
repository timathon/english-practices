const fs = require('fs');
const path = require('path');

/**
 * Batch Audio Renamer
 * Renames files in temp/audio/batch_<id>/ from "001_Word_hash.mp3" to "hash.mp3"
 * 
 * Usage: node scripts/batch-rename.cjs [batch_id_or_path]
 */

const BASE_DIR = path.resolve(__dirname, '..');

function renameBatch(target) {
    let batchPath = target;
    
    // If only a batch ID is provided, resolve it
    if (!target.includes(path.sep)) {
        batchPath = path.join(BASE_DIR, 'temp', 'audio', target.startsWith('batch_') ? target : `batch_${target}`);
    } else if (!path.isAbsolute(target)) {
        batchPath = path.resolve(BASE_DIR, target);
    }

    if (!fs.existsSync(batchPath)) {
        console.error(`❌ Batch directory not found: ${batchPath}`);
        process.exit(1);
    }

    console.log(`📂 Processing: ${batchPath}`);

    const files = fs.readdirSync(batchPath).filter(f => f.endsWith('.mp3'));
    let count = 0;

    files.forEach(file => {
        const parts = file.split('_');
        if (parts.length < 3) {
            console.warn(`⚠️ Skipping ${file}: does not match expected format "order_word_hash.mp3"`);
            return;
        }

        // The hash is the last part before .mp3
        const hashPart = parts[parts.length - 1]; 
        const oldPath = path.join(batchPath, file);
        const newPath = path.join(batchPath, hashPart);

        if (file !== hashPart) {
            fs.renameSync(oldPath, newPath);
            count++;
        }
    });

    console.log(`✅ Successfully renamed ${count} files.`);
}

const arg = process.argv[2];
if (!arg) {
    console.error('❌ Usage: node scripts/batch-rename.cjs [batch_id_or_path]');
    process.exit(1);
}

renameBatch(arg);
