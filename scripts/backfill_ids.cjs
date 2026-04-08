const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateId() {
    return crypto.randomBytes(4).toString('hex');
}

function processDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.name.endsWith('.json')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let raw;
    try {
        raw = fs.readFileSync(filePath, 'utf8');
    } catch (e) { return; }
    
    let db;
    try {
        db = JSON.parse(raw);
    } catch (e) { return; }

    let modified = false;

    if (filePath.endsWith('-vocab-master.json') && db.challenges) {
        db.challenges.forEach(c => {
            if (c.questions) {
                c.questions.forEach(q => {
                    if (!q.id) {
                        q.id = generateId();
                        modified = true;
                    }
                });
            }
        });
    }

    if (filePath.endsWith('-spelling-hero.json') && db.spelling_words) {
        db.spelling_words.forEach(w => {
            if (!w.id) {
                w.id = generateId();
                modified = true;
            }
        });
    }

    if (filePath.endsWith('-sentence-architect.json') && db.challenges) {
        db.challenges.forEach(c => {
            if (c.data) {
                c.data.forEach(d => {
                    if (!d.id) {
                        d.id = generateId();
                        modified = true;
                    }
                });
            }
        });
    }

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf8');
        console.log(`Updated IDs in: ${filePath.split('data/')[1] || path.basename(filePath)}`);
    }
}

const dataDir = path.join(__dirname, '../data');
if (fs.existsSync(dataDir)) {
    console.log("Beginning ID backfill scan...");
    processDirectory(dataDir);
    console.log("Backfill scan complete! Executing database seed script...");
    require('./seed_practices.cjs'); // Run the seeder dynamically!
} else {
    console.error("Data directory not found.");
}
