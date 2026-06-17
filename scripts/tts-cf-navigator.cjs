'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ────────────────────────────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_AI_TOKEN   = process.env.CLOUDFLARE_AI_API_TOKEN;

if (!CF_ACCOUNT_ID) { console.error('❌  CLOUDFLARE_ACCOUNT_ID is not set.'); process.exit(1); }
if (!CF_AI_TOKEN)   { console.error('❌  CLOUDFLARE_AI_API_TOKEN is not set.'); process.exit(1); }

const SOURCE_JSON = path.join(__dirname, '..', 'data', 'RAZ-B', 'raz-b-b', 'raz-b-banana-sometimes', 'raz-b-banana-sometimes-text-navigator.json');
const OUTPUT_DIR  = path.join(__dirname, '..', 'temp', 'audio', 'raz-b-banana-sometimes');

// ── Helpers ───────────────────────────────────────────────────────────────────
function collectNodes(node, results = []) {
    if (node.id !== 'root' && node.text) results.push({ id: node.id, text: node.text });
    for (const child of node.children || []) collectNodes(child, results);
    return results;
}

function callMeloTTS(text) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ prompt: text, lang: 'en' });
        const options = {
            hostname: 'api.cloudflare.com',
            path:     `/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/myshell-ai/melotts`,
            method:   'POST',
            headers:  {
                'Authorization':  `Bearer ${CF_AI_TOKEN}`,
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const buf = Buffer.concat(chunks);
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode}: ${buf.toString('utf8')}`));
                }
                const contentType = res.headers['content-type'] || '';
                if (contentType.includes('audio/')) {
                    resolve(buf);
                } else {
                    try {
                        const json = JSON.parse(buf.toString('utf8'));
                        const audioData = json?.result?.audio || json?.audio || json?.data;
                        if (!audioData) return reject(new Error('No audio field in response: ' + JSON.stringify(json)));
                        resolve(Buffer.from(audioData, 'base64'));
                    } catch (e) {
                        reject(new Error('Failed to parse response: ' + e.message));
                    }
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const json = JSON.parse(fs.readFileSync(SOURCE_JSON, 'utf8'));
    const nodes = collectNodes(json.tree);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log(`📖  Found ${nodes.length} sentences in "${json.part}"`);
    console.log(`📂  Output: ${OUTPUT_DIR}\n`);

    for (let i = 0; i < nodes.length; i++) {
        const { id, text } = nodes[i];
        const outFile = path.join(OUTPUT_DIR, `${id}.mp3`);

        if (fs.existsSync(outFile)) {
            console.log(`   [${i + 1}/${nodes.length}] ⏭️  Skip (exists): ${id}.mp3`);
            continue;
        }

        process.stdout.write(`   [${i + 1}/${nodes.length}] 🎙️  "${text}" … `);
        try {
            const audio = await callMeloTTS(text);
            fs.writeFileSync(outFile, audio);
            console.log(`✅  ${(audio.length / 1024).toFixed(1)} KB`);
        } catch (err) {
            console.log(`❌  ${err.message}`);
        }

        // Small delay to avoid rate-limiting
        if (i < nodes.length - 1) await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n✨  Done!');
}

main();
