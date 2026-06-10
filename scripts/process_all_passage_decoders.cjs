const fs = require('fs');
const path = require('path');
const { processFile } = require('./add_passage_decoder_highlights.cjs');

const dirs = ['data/A5B', 'data/A7B', 'data/A7A'];

for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const subdirs = fs.readdirSync(dir);
    for (const subdir of subdirs) {
        const subDirPath = path.join(dir, subdir);
        if (!fs.statSync(subDirPath).isDirectory()) continue;
        
        const files = fs.readdirSync(subDirPath);
        const vocabGuide = files.find(f => f.endsWith('-vocab-guide.json'));
        const passageDecoders = files.filter(f => f.includes('-passage-decoder-') && f.endsWith('.json'));
        
        if (vocabGuide && passageDecoders.length > 0) {
            const vocabPath = path.join(subDirPath, vocabGuide);
            for (const pd of passageDecoders) {
                const pdPath = path.join(subDirPath, pd);
                console.log(`Processing ${pd} with ${vocabGuide}...`);
                processFile(vocabPath, pdPath);
            }
        }
    }
}
