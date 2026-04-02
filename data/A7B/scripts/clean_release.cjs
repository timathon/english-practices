const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const DIRECTORIES_TO_CLEAN = [
    path.join(BASE_DIR, 'release'),
    path.join(BASE_DIR, 'temp', 'audio')
];

function cleanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        console.log(`Directory does not exist, skipping: ${dirPath}`);
        return;
    }

    try {
        // Delete the directory and all its contents recursively
        fs.rmSync(dirPath, { recursive: true, force: true });
        // Recreate the empty directory
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Successfully cleaned: ${dirPath}`);
    } catch (err) {
        console.error(`Error cleaning directory ${dirPath}:`, err.message);
    }
}

console.log('Starting cleanup process...');

DIRECTORIES_TO_CLEAN.forEach(cleanDirectory);

console.log('Cleanup complete.');
