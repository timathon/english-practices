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

const practiceIds = [
    "A8A_a8a-u3_a8a-u3-text-navigator-a2a",
    "A8A_a8a-u3_a8a-u3-text-navigator-b1b"
];

deletePractices(practiceIds).catch(console.error);
