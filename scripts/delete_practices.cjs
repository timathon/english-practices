/**
 * Usage:
 *   node scripts/delete_practices.cjs <file_path_or_practice_id>
 * 
 * Example:
 *   node scripts/delete_practices.cjs data/A3A/a3a-u6-sentence-architect.json
 * 
 * Target remote endpoint:
 *   API_URL=https://epapi.vibequizzing.com node scripts/delete_practices.cjs data/A3A/a3a-u6-sentence-architect.json
 */

const API_URL = process.env.API_URL || 'http://localhost:8787';

const http = require('http');
const https = require('https');

function myFetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const headers = options.headers || {};
        const reqOptions = {
            method: options.method || 'GET',
            headers: headers,
            host: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
        };
        
        const req = client.request(reqOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    headers: res.headers,
                    text: () => Promise.resolve(data),
                    json: () => Promise.resolve(JSON.parse(data))
                });
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

const path = require('path');

async function deletePractices(ids) {
    console.log("Authenticating as Admin...");
    const authRes = await myFetch(`${API_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:5173'
        },
        body: JSON.stringify({ email: 'adminx@system.local', password: 'adminy' })
    });
    
    if (!authRes.ok) {
        console.error('Failed to authenticate as admin. Status:', authRes.status);
        console.error(await authRes.text());
        return;
    }
    
    const cookies = authRes.headers['set-cookie'] || "";
    console.log("Authenticated.\n");

    for (const id of ids) {
        console.log(`Deleting: ${id}`);
        const deleteRes = await myFetch(`${API_URL}/api/admin/practices/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { 
                'Cookie': cookies 
            }
        });
        
        if (deleteRes.ok) {
            console.log(`  ✓ Deleted`);
        } else {
            console.error(`  ✗ Failed (Status: ${deleteRes.status})`);
            console.error(`  ${await deleteRes.text()}`);
        }
    }
    
    console.log("\nDone!");
}

const args = process.argv.slice(2);
let practiceIds = [];

if (args.length > 0) {
    for (const arg of args) {
        if (arg.endsWith('.json') || arg.includes('/') || arg.includes('\\')) {
            const normalized = path.normalize(arg).replace(/\\/g, '/');
            const parts = normalized.split('/');
            const dataIdx = parts.indexOf('data');
            const tbIndex = dataIdx !== -1 ? dataIdx + 1 : 0;
            
            if (tbIndex < parts.length - 1) {
                const tb = parts[tbIndex];
                const relPathParts = parts.slice(tbIndex + 1);
                const relPath = relPathParts.join('_').replace(/\.json$/, '');
                practiceIds.push(`${tb}_${relPath}`);
            } else {
                practiceIds.push(arg.replace(/\.json$/, '').replace(/[\/\\]/g, '_'));
            }
        } else {
            practiceIds.push(arg);
        }
    }
} else {
    practiceIds = [
        "A7B_a7b-u8_a7b-u8-test"
    ];
}

deletePractices(practiceIds).catch(console.error);

