const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

// Base directory is the project root (parent of scripts/)
const BASE_DIR = path.resolve(__dirname, '..');

// R2 Configuration
const s3Client = new S3Client({
    region: "auto",
    endpoint: "https://11927bf8264141e4f5b12471ea4d95d8.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = "embroid-001";
const PUBLIC_URL_BASE = "https://pub-80888800000000000000000000000000.r2.dev"; // Replace with actual public URL if needed, or use a placeholder

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

async function getAudioForSentence(sentence, folderName) {
    if (!process.env.GOOGLE_API_KEY) {
        console.warn("Skipping audio generation: GOOGLE_API_KEY not set.");
        return null;
    }

    const hash = crypto.createHash('md5').update(sentence).digest('hex');
    const r2Key = `ep/sa/${folderName}/${hash}.mp3`;
    const finalUrl = `https://r2.smartedu.run/${r2Key}`; 

    // Check if exists
    try {
        await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: r2Key }));
        console.log(`Audio exists for: "${sentence.substring(0, 20)}..."`);
        return finalUrl;
    } catch (e) {
        // Continue to generate
    }

    console.log(`Generating audio for: "${sentence}"`);
    const tempWav = path.join(BASE_DIR, `temp_${hash}.wav`);
    const tempMp3 = path.join(BASE_DIR, `temp_${hash}.mp3`);

    const pythonScript = `
import os
import wave
from google import genai
from google.genai import types
client = genai.Client(api_key="${process.env.GOOGLE_API_KEY}")
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Say clearly: ${sentence.replace(/"/g, '\\"')}",
    config=types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")
            )
        )
    )
)
with wave.open("${tempWav}", "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(24000)
    wf.writeframes(response.candidates[0].content.parts[0].inline_data.data)
`;

    fs.writeFileSync('temp_tts.py', pythonScript);
    try {
        execSync('python3 temp_tts.py');
        // Convert to mp3
        execSync(`ffmpeg -i "${tempWav}" -codec:a libmp3lame -qscale:a 2 "${tempMp3}" -y -loglevel error`);
        
        // Upload to R2
        const fileBuffer = fs.readFileSync(tempMp3);
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: r2Key,
            Body: fileBuffer,
            ContentType: "audio/mpeg",
        }));
        
        console.log(`Uploaded audio to R2: ${r2Key}`);
        return finalUrl;
    } catch (err) {
        console.error("Error in audio generation/upload:", err.message);
        return null;
    } finally {
        if (fs.existsSync('temp_tts.py')) fs.unlinkSync('temp_tts.py');
        if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
    }
}

async function generate(jsonPath, type, outputPath, userCount = 3, validityMonths = 3) {
    const absoluteJsonPath = resolvePath(jsonPath);
    let data;
    try {
        data = JSON.parse(fs.readFileSync(absoluteJsonPath, 'utf8'));
    } catch (e) {
        console.error(`Error parsing JSON from ${jsonPath}: ${e.message}`);
        console.warn(`Skipping ${jsonPath} due to invalid format.`);
        return;
    }
    
    let ID_A = data.ID_A || generateIDA();

    // Add encoded suffix to ID_A
    const digits = ID_A.match(/\d/g);
    const lastDigit = digits ? parseInt(digits[digits.length - 1]) : 0;
    
    const userMap = { 3: 'a', 6: 'b', 10: 'c' };
    const validityMap = { 3: 'o', 6: 'p', 12: 'q' };
    
    const uChar = userMap[userCount] || 'a';
    const vChar = validityMap[validityMonths] || 'o';
    
    const suffix = String.fromCharCode(uChar.charCodeAt(0) + lastDigit) + 
                   String.fromCharCode(vChar.charCodeAt(0) + lastDigit);
    
    ID_A += suffix;
    
    const key = generateKey(ID_A);

    // Audio Generation Integration
    const folderName = path.basename(path.dirname(jsonPath)).toLowerCase();
    for (const challenge of data.challenges) {
        for (const item of challenge.data) {
            if (item.en && !item.audio) {
                const audioUrl = await getAudioForSentence(item.en, folderName);
                if (audioUrl) item.audio = audioUrl;
            }
        }
    }
    
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

    console.log('\nUser Count:');
    console.log('1. 3 [default]');
    console.log('2. 6');
    console.log('3. 10');
    const userCountInput = await question('Select user count (1, 2, or 3) [1]: ');
    const userCount = userCountInput === '2' ? 6 : (userCountInput === '3' ? 10 : 3);

    console.log('\nValidity Months:');
    console.log('1. 3 [default]');
    console.log('2. 6');
    console.log('3. 12');
    const validityMonthsInput = await question('Select validity months (1, 2, or 3) [1]: ');
    const validityMonths = validityMonthsInput === '2' ? 6 : (validityMonthsInput === '3' ? 12 : 3);

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
            await generate(jsonPath, selectedType, outputPath, userCount, validityMonths);
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
