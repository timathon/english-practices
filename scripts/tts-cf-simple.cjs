'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ────────────────────────────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_AI_TOKEN = process.env.CLOUDFLARE_AI_API_TOKEN;
const OUTPUT_DIR = path.join(__dirname, '..', 'temp', 'audio');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'hello-melotts.mp3');

if (!CF_ACCOUNT_ID) {
    console.error('❌  CLOUDFLARE_ACCOUNT_ID is not set.');
    process.exit(1);
}
if (!CF_AI_TOKEN) {
    console.error('❌  CLOUDFLARE_AI_API_TOKEN is not set.');
    process.exit(1);
}

// ── Request ───────────────────────────────────────────────────────────────────
const body = JSON.stringify({
    prompt: 'Hello, welcome to Cloudflare AI!',
    lang: 'en',
    speed: 0.75
});

const options = {
    hostname: 'api.cloudflare.com',
    path: `/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/myshell-ai/melotts`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${CF_AI_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    },
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('🎙️  Calling Cloudflare Workers AI → @cf/myshell-ai/melotts…');

const req = https.request(options, (res) => {
    console.log(`   HTTP ${res.statusCode}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);

    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
        const buf = Buffer.concat(chunks);

        if (res.statusCode !== 200) {
            console.error('❌  Error response:');
            console.error(buf.toString('utf8'));
            process.exit(1);
        }

        const contentType = res.headers['content-type'] || '';

        if (contentType.includes('audio/')) {
            // Raw audio bytes
            fs.writeFileSync(OUTPUT_FILE, buf);
        } else {
            // JSON response — extract base64-encoded audio
            try {
                const json = JSON.parse(buf.toString('utf8'));
                console.log('   Response keys:', Object.keys(json));
                const audioData =
                    json?.result?.audio ||   // common CF wrapper
                    json?.audio ||   // flat
                    json?.data;                 // fallback
                if (!audioData) {
                    console.error('❌  Could not find audio in response:');
                    console.error(JSON.stringify(json, null, 2));
                    process.exit(1);
                }
                fs.writeFileSync(OUTPUT_FILE, Buffer.from(audioData, 'base64'));
            } catch (e) {
                console.error('❌  Failed to parse response:', e.message);
                console.error(buf.toString('utf8'));
                process.exit(1);
            }
        }

        const stat = fs.statSync(OUTPUT_FILE);
        console.log(`✅  Saved to: ${OUTPUT_FILE}`);
        console.log(`   Size: ${(stat.size / 1024).toFixed(1)} KB`);
    });
});

req.on('error', (err) => {
    console.error('❌  Request error:', err.message);
    process.exit(1);
});

req.write(body);
req.end();
