const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:8787';
const FORCE = process.argv.includes('--force');
const { execSync } = require('child_process');

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
                    headers: {
                        get: (name) => {
                            const val = res.headers[name.toLowerCase()];
                            return Array.isArray(val) ? val.join(', ') : val;
                        }
                    },
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

function getChangedOrAddedJsonFiles() {
    try {
        const statusOutput = execSync('git status --porcelain "data/**/*.json"', { encoding: 'utf8' });
        let diffOutput = "";
        try {
            diffOutput = execSync('git diff --name-only origin/main "data/**/*.json"', { encoding: 'utf8' });
        } catch (e) {
            // In case origin/main is not found or fetched
        }
        
        const filesSet = new Set();
        
        if (statusOutput.trim()) {
            const lines = statusOutput.split('\n');
            for (const line of lines) {
                if (line.length < 4) continue;
                const status = line.substring(0, 2);
                if (status.includes('D')) continue;
                
                let filePath = line.substring(3).trim();
                if (status.startsWith('R') && filePath.includes(' -> ')) {
                    filePath = filePath.split(' -> ')[1].trim();
                }
                if (filePath.startsWith('"') && filePath.endsWith('"')) {
                    filePath = filePath.substring(1, filePath.length - 1);
                }
                filesSet.add(filePath);
            }
        }
        
        if (diffOutput.trim()) {
            const lines = diffOutput.split('\n');
            for (const line of lines) {
                const filePath = line.trim();
                if (filePath && fs.existsSync(filePath)) {
                    filesSet.add(filePath);
                }
            }
        }
        
        return Array.from(filesSet);
    } catch (e) {
        console.error("Failed to run git status/diff:", e.message);
        return [];
    }
}

function checkChanges() {
    if (FORCE) return true;
    const changed = getChangedOrAddedJsonFiles();
    return changed.length > 0;
}

async function seed() {
    if (!checkChanges()) {
        console.log("No changes detected in data/**/*.json. Skipping sync. Use --force to override.");
        return;
    }
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
    
    let cookies = authRes.headers.get('set-cookie');
    if (!cookies) {
         // Some versions of standard fetch might return cookies differently
         console.warn("No Set-Cookie header found. The upload may fail if auth is required.");
         cookies = "";
    }
    
    const dataDir = path.join(__dirname, '..', 'data');
    const changedFiles = FORCE ? null : getChangedOrAddedJsonFiles();
    
    const practices = [];
    const filesToProcess = [];
    
    if (FORCE) {
        const textbooks = fs.readdirSync(dataDir).filter(f => !f.startsWith('.') && fs.statSync(path.join(dataDir, f)).isDirectory());
        
        function findJsonFiles(dir) {
            let results = [];
            if (!fs.existsSync(dir)) return results;
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(findJsonFiles(fullPath));
                } else if (file.endsWith('.json')) {
                    results.push(fullPath);
                }
            });
            return results;
        }

        for (const tb of textbooks) {
            const tbDir = path.join(dataDir, tb);
            const jsonFiles = findJsonFiles(tbDir);
            for (const f of jsonFiles) {
                filesToProcess.push({
                    textbook: tb,
                    filePath: f,
                    tbDir: tbDir
                });
            }
        }
    } else {
        for (const relPath of changedFiles) {
            const fullPath = path.resolve(relPath);
            const relativeToData = path.relative(dataDir, fullPath);
            const parts = relativeToData.split(path.sep);
            if (parts.length < 2) continue; // Not inside a textbook subfolder
            const tb = parts[0];
            const tbDir = path.join(dataDir, tb);
            filesToProcess.push({
                textbook: tb,
                filePath: fullPath,
                tbDir: tbDir
            });
        }
    }

    for (const itemToProc of filesToProcess) {
        const { textbook: tb, filePath, tbDir } = itemToProc;
        const relPath = path.relative(tbDir, filePath);
        const filename = path.basename(filePath);
        const match = filename.match(/^([a-z0-9-]+)-([uUmMlL]\d+)-(.*)\.json$/i);
        const matchCgiu = filename.match(/^c-giu-(\d+)-(.*)\.json$/i);
        let unit = 'General';
        let type = 'unknown';
        
        if (match) {
            unit = match[2].toUpperCase();
            type = match[3];
        } else if (matchCgiu) {
            unit = 'U' + matchCgiu[1];
            type = matchCgiu[2];
        } else {
            const parts = relPath.split(path.sep);
            if (parts.length > 1) {
                let folderName = parts[0];
                
                // Handle RAZ-B nested structure (e.g., RAZ-B/raz-b-a/raz-b-after-school/...)
                if (tb === 'RAZ-B' && /^raz-b-[a-z]$/i.test(folderName) && parts.length > 2) {
                    folderName = parts[1];
                }

                if (folderName.startsWith('raz-b-')) {
                    unit = folderName.replace(/^raz-b-/i, '')
                        .split('-')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ');
                } else {
                    unit = folderName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                }
            }
            
            const knownTypes = [
                'vocab-guide',
                'vocab-master',
                'spelling-hero',
                'sentence-architect',
                'recall-map',
                'grammar-wizard',
                'text-navigator',
                'writing-map',
                'passage-decoder'
            ];
            
            for (const kt of knownTypes) {
                if (filename.includes(kt)) {
                    const idx = filename.indexOf(kt);
                    type = filename.substring(idx).replace('.json', '');
                    break;
                }
            }
            
            if (type === 'unknown') {
                type = filename.replace('.json', '');
            }
        }
        
        if (!fs.existsSync(filePath)) continue;
        const raw = fs.readFileSync(filePath, 'utf-8');
        try {
            const content = JSON.parse(raw);
            
            // Extract writing task prompt for writing maps
            if (filename.includes('-writing-map-')) {
                const dir = path.dirname(filePath);
                let mdPath = "";
                if (filename.includes('-model-x')) {
                    mdPath = path.join(dir, filename.replace(/-writing-map-model-x-?\d*\.json$/, '-writing-task-x.md'));
                }
                if (!mdPath || !fs.existsSync(mdPath)) {
                    if (filename.includes('-model-')) {
                        mdPath = path.join(dir, filename.replace(/-writing-map-model-?\d*\.json$/, '-writing-task.md'));
                    }
                }
                if (!mdPath || !fs.existsSync(mdPath)) {
                    mdPath = path.join(dir, filename.replace(/-writing-map-.+\.json$/, '-writing-task.md'));
                }
                if (!mdPath || !fs.existsSync(mdPath)) {
                    mdPath = path.join(dir, filename.replace(/\.json$/, '.md'));
                }
                if (mdPath && fs.existsSync(mdPath)) {
                    let contentMd = fs.readFileSync(mdPath, 'utf8');
                    contentMd = contentMd.split(/### Model Essay/i)[0].trim();
                    content.writingPrompt = contentMd;
                    console.log(`[Prompt Embedded] for ${filename} from ${path.basename(mdPath)}`);
                }
            }

            practices.push({
                id: `${tb}_${relPath.replace(/\.json$/, '').replace(/[\/\\]/g, '_')}`,
                textbook: tb,
                unit: unit,
                type: type,
                title: content.title || filename,
                content: content
            });
        } catch (e) {
            console.error(`Failed to parse ${relPath}: ${e.message}`);
        }
    }
    
    console.log(`Found ${practices.length} valid JSON practices to seed. Beginning upload...`);

    if (FORCE) {
        console.log("Clearing existing practices in DB (due to --force)...");
        const clearRes = await myFetch(`${API_URL}/api/admin/practices`, {
            method: 'DELETE',
            headers: { 
                'Cookie': cookies 
            }
        });
        if (!clearRes.ok) {
            console.error('Failed to clear practices in DB. Status:', clearRes.status);
            console.error(await clearRes.text());
            return;
        }
        console.log("Successfully cleared existing practices.");
    } else {
        console.log("Partial sync: Skipping database clear (upserting changed/added files only).");
    }
    
    let successCount = 0;
    for (let i = 0; i < practices.length; i += 20) {
        const chunk = practices.slice(i, i + 20);
        const uploadRes = await myFetch(`${API_URL}/api/admin/practices`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': cookies 
            },
            body: JSON.stringify(chunk)
        });
        
        if (!uploadRes.ok) {
            console.error(`Failed to upload chunk starting at index ${i}. Status: ${uploadRes.status}`);
            console.error(await uploadRes.text());
        } else {
            successCount += chunk.length;
            console.log(`Successfully uploaded ${successCount} / ${practices.length} practices.`);
        }
    }
    console.log('Seed sequence complete!');
}

seed().catch(console.error);
