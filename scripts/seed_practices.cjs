const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:8787';

async function seed() {
    console.log("Authenticating as Admin...");
    const authRes = await fetch(`${API_URL}/api/auth/sign-in/email`, {
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
    const textbooks = fs.readdirSync(dataDir).filter(f => !f.startsWith('.') && fs.statSync(path.join(dataDir, f)).isDirectory());
    
    const practices = [];
    
    for (const tb of textbooks) {
        const tbDir = path.join(dataDir, tb);
        const files = fs.readdirSync(tbDir).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
            const match = file.match(/^([a-z0-9]+)-([uUmM]\d+)-(.*)\.json$/i);
            let unit = 'General';
            let type = 'unknown';
            
            if (match) {
                unit = match[2].toUpperCase();
                type = match[3];
            } else {
                type = file.replace('.json', '');
            }
            
            const raw = fs.readFileSync(path.join(tbDir, file), 'utf-8');
            try {
                const content = JSON.parse(raw);
                practices.push({
                    id: `${tb}_${file.replace('.json', '')}`,
                    textbook: tb,
                    unit: unit,
                    type: type,
                    title: content.title || file,
                    content: content
                });
            } catch (e) {
                console.error(`Failed to parse ${file}: ${e.message}`);
            }
        }
    }
    
    console.log(`Found ${practices.length} valid JSON practices. Beginning upload...`);
    
    let successCount = 0;
    for (let i = 0; i < practices.length; i += 20) {
        const chunk = practices.slice(i, i + 20);
        const uploadRes = await fetch(`${API_URL}/api/admin/practices`, {
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
