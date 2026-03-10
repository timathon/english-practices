const fs = require('fs');
const path = require('path');

/**
 * Batch Rename Audio Script
 * Renames files in temp/audio/ba/ (e.g., 滑音_1.mp3) to have hashed names (e.g., {hash}.mp3)
 * based on a mapping found in a source folder (e.g., temp/audio/batch_0839ad6eA/).
 * 
 * Usage: node scripts/batch-rename.cjs [source_folder_name]
 */

const BASE_DIR = path.resolve(__dirname, '..');
const DEST_DIR = path.join(BASE_DIR, 'temp/audio/ba');
const DEFAULT_SOURCE_NAME = 'batch_0839ad6eA';

async function renameFiles(sourceFolderName) {
    const sourceDir = path.join(BASE_DIR, 'temp/audio', sourceFolderName);

    if (!fs.existsSync(DEST_DIR)) {
        console.error(`❌ Destination directory not found: ${DEST_DIR}`);
        return;
    }

    if (!fs.existsSync(sourceDir)) {
        console.error(`❌ Source directory not found: ${sourceDir}`);
        return;
    }

    console.log(`Reading source files from ${sourceDir}...`);
    const sourceFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.mp3'));
    
    // Create a mapping of index (padded to 3 digits) to hash
    // Example: 001_Im_95ce25423a6c0f5eb332739e18452b6b.mp3 -> { "001": "95ce25423a6c0f5eb332739e18452b6b" }
    const hashMapping = {};
    sourceFiles.forEach(file => {
        const parts = file.split('_');
        if (parts.length >= 3) {
            const index = parts[0]; // e.g., "001"
            const hashWithExt = parts[parts.length - 1]; // e.g., "hash.mp3"
            const hash = path.parse(hashWithExt).name;
            hashMapping[index] = hash;
        }
    });

    console.log(`Found ${Object.keys(hashMapping).length} mappings.`);

    const destFiles = fs.readdirSync(DEST_DIR).filter(f => f.includes('_') && f.endsWith('.mp3'));
    let successCount = 0;

    destFiles.forEach(file => {
        // Example: 滑音_1.mp3 -> extract "1"
        const match = file.match(/_(\d+)\.mp3$/);
        if (match) {
            const num = match[1];
            const paddedIndex = num.padStart(3, '0');
            const targetHash = hashMapping[paddedIndex];

            if (targetHash) {
                const oldPath = path.join(DEST_DIR, file);
                const newPath = path.join(DEST_DIR, `${targetHash}.mp3`);
                
                try {
                    fs.renameSync(oldPath, newPath);
                    console.log(`✅ Renamed: ${file} -> ${targetHash}.mp3`);
                    successCount++;
                } catch (err) {
                    console.error(`❌ Error renaming ${file}:`, err.message);
                }
            } else {
                console.warn(`⚠️ No mapping found for index ${paddedIndex} (${file})`);
            }
        }
    });

    console.log(`\n✨ Task completed. Successfully renamed ${successCount} files.`);
}

const args = process.argv.slice(2);
const sourceFolder = args[0] || DEFAULT_SOURCE_NAME;

renameFiles(sourceFolder);
