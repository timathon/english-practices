const fs = require('fs');
const path = require('path');

const dirs = ['A3A', 'A3B', 'A5B', 'A6B', 'A7A', 'A7B', 'Think1', 'RAZ-B', 'book-reviews', 'my-exercises'];

function updateFile(filePath) {
    if (filePath.endsWith('index.html')) return;
    if (filePath.includes('templates/')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // 1. Update cacheAudio(url) to cacheAudio(url, force = false)
    // We need to match the function definition precisely but flexibly.
    const cacheAudioRegex = /cacheAudio:\s*async\s*function\s*\(\s*url\s*\)\s*\{([\s\S]*?)\},/g;
    
    content = content.replace(cacheAudioRegex, (match, body) => {
        // If already updated, skip
        if (body.includes('force = false') || body.includes('if (!force)')) return match;
        
        changed = true;
        // Construct new body
        let newBody = body;
        
        // Add force parameter logic
        // Look for: const cacheKey = "ep-audio-" + baseHash;
        const cacheKeyLine = /const cacheKey = "ep-audio-" \+ baseHash;/;
        if (cacheKeyLine.test(newBody)) {
            newBody = newBody.replace(cacheKeyLine, 'const cacheKey = "ep-audio-" + baseHash;\n            \n            if (!force) {\n                const cached = await db.get(cacheKey);\n                if (cached) return cached.blob;\n            }');
            
            // Remove the old cached check if it exists:
            // const cached = await db.get(cacheKey);
            // if (cached) return cached.blob;
            // But be careful not to remove the one we just added.
            // Actually, my regex is a bit simplistic. Let's be more precise.
        }

        // Replace the fetch part
        // const resp = await fetch(url);
        newBody = newBody.replace(/const resp = await fetch\(url\);/, "const fetchUrl = force ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : url;\n                const resp = await fetch(fetchUrl);");

        // Remove old cached check if it's there
        const oldCachedCheck = /const cached = await db\.get\(cacheKey\);\s*if\s*\(cached\)\s*return\s*cached\.blob;/;
        // We only want to remove the one that's NOT inside our new "if (!force)" block.
        // This is getting complex for a simple regex.

        // Let's use a more robust replacement for the whole function.
        const indent = match.match(/^\s*/)[0];
        const isApp = match.includes('cacheAudio:'); // Should be true based on regex
        
        const newFunc = `cacheAudio: async function(url, force = false) {
            if (!url) return;
            const baseUrl = url.split('?')[0];
            const baseHash = this.getHash(baseUrl);
            const cacheKey = "ep-audio-" + baseHash;
            
            if (!force) {
                const cached = await db.get(cacheKey);
                if (cached) return cached.blob;
            }

            try {
                const fetchUrl = force ? \`\${url}\${url.includes('?') ? '&' : '?'}t=\${Date.now()}\` : url;
                const resp = await fetch(fetchUrl);
                if (!resp.ok) return null;
                const contentType = resp.headers.get('Content-Type');
                if (!contentType || !contentType.startsWith('audio/')) return null;
                const lastModified = resp.headers.get('Last-Modified');
                const blob = await resp.blob();
                const meta = lastModified ? { lastModified: new Date(lastModified).getTime() } : {};
                await db.set(cacheKey, blob, meta);
                return blob;
            } catch(e) { console.error("Cache failed", e); }
        },`;
        
        return newFunc;
    });

    // 2. Update refreshCache
    // Case 1: sa-shell style (challenges)
    // Case 2: vocab-guide style (vocabData)
    
    // Update fetch(url, { method: 'HEAD' })
    const headFetchRegex = /const response = await fetch\(url, \{ method: 'HEAD' \}\);/g;
    if (headFetchRegex.test(content)) {
        content = content.replace(headFetchRegex, "const headUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;\n                        const response = await fetch(headUrl, { method: 'HEAD' });");
        changed = true;
    }

    // Update await this.cacheAudio(url) to await this.cacheAudio(url, true)
    // This is specifically inside refreshCache.
    // We can use a regex that looks for cacheAudio(url) after the Last-Modified check.
    const refreshCacheSectionRegex = /refreshCache: async function\(\) \{([\s\S]*?)\},/g;
    content = content.replace(refreshCacheSectionRegex, (match, body) => {
        if (body.includes('cacheAudio(url, true)')) return match;
        
        let newBody = body.replace(/await this\.cacheAudio\(url\);/g, 'await this.cacheAudio(url, true)');
        if (newBody !== body) {
            changed = true;
            return `refreshCache: async function() {${newBody}},`;
        }
        return match;
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.html')) {
            updateFile(fullPath);
        }
    });
}

dirs.forEach(dir => {
    const fullPath = path.resolve('/home/timathon/codes/smartedu/english-practices', dir);
    if (fs.existsSync(fullPath)) {
        walk(fullPath);
    }
});
