const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Base directory is the project root (parent of scripts/)
const BASE_DIR = path.resolve(__dirname, '..');

function resolvePath(p) {
    return path.isAbsolute(p) ? p : path.resolve(BASE_DIR, p);
}

/**
 * ID_A Generation Logic:
 * 1. Find a random 7-digit number (1111111–9999999) where the sum of its digits is divisible by 7 (sum % 7 = 0).
 * 2. Mix in 8 random letters (a-z, A-Z) to create a 15-character string.
 * 3. The sequence of the 7 digits must remain unchanged if letters are stripped.
 */
function generateIDA() {
    let digits = "";
    while (true) {
        const num = Math.floor(Math.random() * (9999999 - 1111111 + 1)) + 1111111;
        const numStr = num.toString();
        const sum = numStr.split("").reduce((a, b) => a + parseInt(b), 0);
        if (sum % 7 === 0) {
            digits = numStr;
            break;
        }
    }

    const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let randomLetters = "";
    for (let i = 0; i < 8; i++) {
        randomLetters += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Mix them organically
    let result = new Array(15);
    let digitIndices = [];
    while (digitIndices.length < 7) {
        const idx = Math.floor(Math.random() * 15);
        if (!digitIndices.includes(idx)) {
            digitIndices.push(idx);
        }
    }
    digitIndices.sort((a, b) => a - b);

    let digitPointer = 0;
    let letterPointer = 0;
    for (let i = 0; i < 15; i++) {
        if (digitIndices.includes(i)) {
            result[i] = digits[digitPointer++];
        } else {
            result[i] = randomLetters[letterPointer++];
        }
    }

    return result.join("");
}

function generateKey(idA) {
    let hash = 5381;
    for (let i = 0; i < idA.length; i++) {
        hash = ((hash << 5) + hash) + idA.charCodeAt(i);
    }
    return hash >>> 0;
}

function xorEncrypt(bytes, key) {
    const keyBytes = new Uint8Array(4);
    keyBytes[0] = key & 0xFF;
    keyBytes[1] = (key >> 8) & 0xFF;
    keyBytes[2] = (key >> 16) & 0xFF;
    keyBytes[3] = (key >> 24) & 0xFF;
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        result[i] = bytes[i] ^ keyBytes[i % 4];
    }
    return result;
}

function getTimestamp() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return now.getFullYear() + 
           pad(now.getMonth() + 1) + 
           pad(now.getDate()) + 
           pad(now.getHours()) + 
           pad(now.getMinutes());
}

const currentRunTimestamp = getTimestamp();

function generateIndexHtml(title, items, backPath = null) {
    const listItems = items.map(item => `<li><a href="${item.path}">${item.name}</a></li>`).join('\n            ');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
        h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        ul { list-style-type: none; padding-left: 0; }
        li { margin-bottom: 10px; background: #f9f9f9; padding: 10px; border-radius: 8px; border: 1px solid #eee; }
        a { text-decoration: none; color: #0366d6; font-weight: bold; display: block; }
        a:hover { color: #005cc5; }
        .back-link { margin-bottom: 20px; display: inline-block; color: #666; font-size: 0.9rem; }
    </style>
</head>
<body>
    ${backPath ? `<a href="${backPath}" class="back-link">← Back</a>` : ""}
    <h1>${title}</h1>
    <ul>
        ${listItems}
    </ul>
</body>
</html>`;
}

function rebuildIndexes() {
    const releaseDir = resolvePath('release');
    if (!fs.existsSync(releaseDir)) return;

    const timestampFolders = fs.readdirSync(releaseDir).filter(f => /^\d{12}$/.test(f));
    
    timestampFolders.forEach(ts => {
        const tsPath = path.join(releaseDir, ts);
        const types = ["post", "builtin"];

        types.forEach(type => {
            const typePath = path.join(tsPath, type);
            if (!fs.existsSync(typePath)) return;

            const subfolders = fs.readdirSync(typePath).filter(f => fs.statSync(path.join(typePath, f)).isDirectory());
            
            subfolders.forEach(sub => {
                const subPath = path.join(typePath, sub);
                const files = fs.readdirSync(subPath)
                    .filter(f => f.endsWith(".html") && f !== "index.html")
                    .map(f => ({ name: f.replace(/-/g, " ").replace(".html", ""), path: f }));
                
                if (files.length > 0) {
                    fs.writeFileSync(path.join(subPath, "index.html"), generateIndexHtml(`${sub} Exercises`, files, "../index.html"));
                }
            });

            const subIndexLinks = subfolders
                .filter(sub => fs.existsSync(path.join(typePath, sub, "index.html")))
                .map(sub => ({ name: sub, path: `${sub}/index.html` }));
            
            fs.writeFileSync(path.join(typePath, "index.html"), generateIndexHtml("Practice Exercises", subIndexLinks));
        });
    });
}

function generate(jsonPath, type, outputPath) {
    const absoluteJsonPath = resolvePath(jsonPath);
    const data = JSON.parse(fs.readFileSync(absoluteJsonPath, 'utf8'));
    
    const ID_A = data.ID_A || generateIDA();
    const key = generateKey(ID_A);
    
    const json = JSON.stringify(data.challenges);
    const bytes = Buffer.from(json, 'utf8');
    const encrypted = xorEncrypt(bytes, key);
    const base64 = Buffer.from(encrypted).toString('base64');

    const templateName = type === 'post' ? 'templates/shell-post.html' : 'templates/shell-builtin.html';
    const templatePath = resolvePath(templateName);
    let html = fs.readFileSync(templatePath, 'utf8');

    html = html.replace(/{{TITLE}}/g, data.title);
    html = html.replace(/{{LEVEL}}/g, data.level || "Sentence Architect");
    html = html.replace(/{{PRIMARY_COLOR}}/g, data.primaryColor || "#58cc02");
    html = html.replace(/{{PRIMARY_COLOR_DARK}}/g, data.primaryColorDark || "#46a302");
    html = html.replace(/{{ID_A}}/g, ID_A);
    html = html.replace(/{{STORAGE_SUFFIX}}/g, data.storageSuffix || "");
    html = html.replace(/{{PASSCODE}}/g, data.passcode || "TEACHER");
    html = html.replace(/{{IPA_DICT}}/g, JSON.stringify(data.ipaDict));
    html = html.replace(/{{ENCRYPTED_DATA}}/g, base64);
    
    if (type === 'builtin') {
        html = html.replace(/{{BUILTIN_KEY}}/g, key);
    }

    let finalPath = resolvePath(outputPath);
    const releaseDir = resolvePath('release');
    if (finalPath.startsWith(releaseDir)) {
        const relativeToRelease = path.relative(releaseDir, finalPath);
        if (!/^\d{12}[\/\\]/.test(relativeToRelease)) {
            finalPath = path.join(releaseDir, currentRunTimestamp, relativeToRelease);
        }
    }

    const outDir = path.dirname(finalPath);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(finalPath, html);
    console.log(`Generated ${finalPath} (${type}) with ID_A: ${ID_A}`);
    
    rebuildIndexes();
}

async function checkboxSelector(message, options) {
    return new Promise((resolve) => {
        const choices = options.map(o => ({ name: o, selected: false }));
        let cursor = 0;

        const render = () => {
            process.stdout.write('\x1B[?25l');
            process.stdout.write('\x1B[H\x1B[J');
            console.log(`\n${message}`);
            console.log(' (Use space to toggle, "a" to select all, enter to confirm)\n');

            choices.forEach((choice, i) => {
                const prefix = i === cursor ? '> ' : '  ';
                const box = choice.selected ? '[x]' : '[ ]';
                console.log(`${prefix}${box} ${choice.name}`);
            });
        };

        const onKeyPress = (str, key) => {
            if (key.name === 'up') {
                cursor = (cursor - 1 + choices.length) % choices.length;
                render();
            } else if (key.name === 'down') {
                cursor = (cursor + 1) % choices.length;
                render();
            } else if (key.name === 'space') {
                choices[cursor].selected = !choices[cursor].selected;
                render();
            } else if (key.name === 'a') {
                const allSelected = choices.every(c => c.selected);
                choices.forEach(c => c.selected = !allSelected);
                render();
            } else if (key.name === 'return') {
                cleanup();
                const selected = choices.filter(c => c.selected).map(c => c.name);
                resolve(selected);
            } else if (key.ctrl && key.name === 'c') {
                cleanup();
                process.exit();
            }
        };

        const cleanup = () => {
            process.stdin.removeListener('keypress', onKeyPress);
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write('\x1B[?25h');
            console.log('\n');
        };

        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('keypress', onKeyPress);
        render();
    });
}

async function interactive() {
    const dataDir = resolvePath('data');
    if (!fs.existsSync(dataDir)) {
        console.error('Data directory not found at ' + dataDir);
        return;
    }

    const folders = fs.readdirSync(dataDir).filter(f => fs.statSync(path.join(dataDir, f)).isDirectory());

    if (folders.length === 0) {
        console.error('No subfolders found in ' + dataDir);
        return;
    }

    const selectedFolders = await checkboxSelector('Select folders to process:', folders);

    if (selectedFolders.length === 0) {
        console.log('No folders selected. Exiting.');
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    console.log('\nRelease Types:');
    console.log('1. post (Authenticated) [default]');
    console.log('2. builtin (Standalone)');
    
    const typeIdxInput = await question('\nSelect type (1 or 2) [1]: ');
    const selectedType = (typeIdxInput === '2') ? 'builtin' : 'post';
    rl.close();

    for (const selectedFolder of selectedFolders) {
        const folderPath = path.join(dataDir, selectedFolder);
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.json'));

        if (files.length === 0) {
            console.warn(`No JSON files found in ${selectedFolder}. Skipping.`);
            continue;
        }

        console.log(`\nProcessing folder: ${selectedFolder} (${files.length} files)`);

        for (const file of files) {
            const jsonPath = path.join(folderPath, file);
            const outputFilename = file.replace(".json", ".html");
            const outputPath = path.join('release', selectedType, selectedFolder, outputFilename);
            generate(jsonPath, selectedType, outputPath);
        }
    }

    console.log('\nBatch generation complete.');
}

const args = process.argv.slice(2);
if (args.length === 0) {
    interactive();
} else if (args.length >= 3) {
    generate(args[0], args[1], args[2]);
} else {
    console.log("Usage:");
    console.log("  Interactive: node generate_release.js");
    console.log("  Direct:      node generate_release.js <json_path> <type: post|builtin> <output_path>");
    process.exit(1);
}
