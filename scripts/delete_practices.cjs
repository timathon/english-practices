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

/**
 * Usage:
 *   node scripts/delete_practices.cjs <file_path_or_folder_path_or_practice_id>
 * 
 * Example:
 *   node scripts/delete_practices.cjs data/A5Bx/a5bx-wm3
 *   node scripts/delete_practices.cjs data/A3A/a3a-u6-sentence-architect.json
 * 
 * Target remote endpoint:
 *   API_URL=https://epapi.vibequizzing.com node scripts/delete_practices.cjs data/A3A/a3a-u6-sentence-architect.json
 */

const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const targetUrls = [];
if (process.env.API_URL) {
    targetUrls.push(process.env.API_URL);
} else {
    targetUrls.push('http://localhost:8787');
    targetUrls.push('https://epapi.vibequizzing.com');
}

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

function getJsonFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getJsonFiles(filePath));
        } else if (file.endsWith('.json')) {
            results.push(filePath);
        }
    });
    return results;
}

function pathToId(arg) {
    const normalized = path.normalize(arg).replace(/\\/g, '/');
    const parts = normalized.split('/');
    const dataIdx = parts.indexOf('data');
    const tbIndex = dataIdx !== -1 ? dataIdx + 1 : 0;
    
    if (tbIndex < parts.length - 1) {
        const tb = parts[tbIndex];
        const relPathParts = parts.slice(tbIndex + 1);
        const relPath = relPathParts.join('_').replace(/\.json$/, '');
        return `${tb}_${relPath}`;
    } else {
        return arg.replace(/\.json$/, '').replace(/[\/\\]/g, '_');
    }
}

async function deleteFromEndpoint(apiUrl, ids) {
    console.log(`\n--- Deleting from DB at ${apiUrl} ---`);
    console.log("Authenticating as Admin...");
    try {
        const authRes = await myFetch(`${apiUrl}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5173'
            },
            body: JSON.stringify({ email: 'adminx@system.local', password: 'adminy' })
        });
        
        if (!authRes.ok) {
            console.error(`  ✗ Failed to authenticate as admin on ${apiUrl}. Status:`, authRes.status);
            console.error(`  ${await authRes.text()}`);
            return;
        }
        
        const cookies = authRes.headers['set-cookie'] || "";
        console.log("Authenticated.");

        for (const id of ids) {
            console.log(`Deleting: ${id}`);
            const deleteRes = await myFetch(`${apiUrl}/api/admin/practices/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers: { 
                    'Cookie': cookies 
                }
            });
            
            if (deleteRes.ok) {
                console.log(`  ✓ Deleted from DB`);
            } else {
                console.error(`  ✗ Failed to delete from DB (Status: ${deleteRes.status})`);
                console.error(`  ${await deleteRes.text()}`);
            }
        }
    } catch (err) {
        console.error(`  ✗ Failed to connect or complete requests on ${apiUrl}:`, err.message);
    }
}

async function main() {
    const args = process.argv.slice(2);
    let practiceIds = [];

    if (args.length > 0) {
        for (const arg of args) {
            if (fs.existsSync(arg)) {
                const stat = fs.statSync(arg);
                if (stat.isDirectory()) {
                    const jsonFiles = getJsonFiles(arg);
                    for (const file of jsonFiles) {
                        practiceIds.push(pathToId(file));
                    }
                } else {
                    practiceIds.push(pathToId(arg));
                }
            } else {
                // If it doesn't exist on disk, check if it's path-like or just practice ID
                if (arg.endsWith('.json') || arg.includes('/') || arg.includes('\\')) {
                    practiceIds.push(pathToId(arg));
                } else {
                    practiceIds.push(arg);
                }
            }
        }
    } else {
        console.log("Usage: node scripts/delete_practices.cjs <file_path_or_folder_path_or_practice_id>");
        process.exit(1);
    }

    if (practiceIds.length > 0) {
        for (const url of targetUrls) {
            await deleteFromEndpoint(url, practiceIds);
        }
    }
    
    console.log("\nDone!");
}

main().catch(console.error);

