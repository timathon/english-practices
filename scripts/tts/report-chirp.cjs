/**
 * chirp-report.cjs (scripts/tts/chirp-report.cjs)
 * 
 * Queries Google Cloud Monitoring API for the current project's 
 * Text-to-Speech (Chirp 3 / GCP TTS) API request counts and character usage.
 * 
 * Usage:
 *   node scripts/tts/chirp-report.cjs
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getAccessToken() {
    // 1. Try gcloud auth print-access-token
    try {
        const token = execSync('gcloud auth print-access-token 2>/dev/null').toString().trim();
        if (token) return token;
    } catch (e) {}

    // 2. Try python google.auth
    try {
        const pythonScript = "import google.auth, google.auth.transport.requests; creds, _ = google.auth.default(); creds.refresh(google.auth.transport.requests.Request()); print(creds.token)";
        const token = execSync(`python3 -c "${pythonScript}" 2>/dev/null`).toString().trim();
        if (token) return token;
    } catch (e) {}

    // 3. Try reading refresh token directly from application_default_credentials.json
    try {
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || require('os').homedir() + '/.config/gcloud/application_default_credentials.json';
        if (fs.existsSync(credPath)) {
            const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
            if (creds.client_id && creds.client_secret && creds.refresh_token) {
                const postData = new URLSearchParams({
                    client_id: creds.client_id,
                    client_secret: creds.client_secret,
                    refresh_token: creds.refresh_token,
                    grant_type: 'refresh_token'
                }).toString();

                const res = execSync(`curl -s -X POST -d "${postData}" https://oauth2.googleapis.com/token`).toString();
                const tokenData = JSON.parse(res);
                if (tokenData.access_token) return tokenData.access_token;
            }
        }
    } catch (e) {}

    console.error("❌ Error obtaining Google Cloud Access Token. Make sure GOOGLE_APPLICATION_CREDENTIALS or gcloud is set.");
    process.exit(1);
}

function fetchTimeSeries(token, filter, startTime, endTime) {
    const projectId = "pitter-patter-469708";
    const encodedFilter = encodeURIComponent(filter);
    const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?filter=${encodedFilter}&interval.startTime=${startTime}&interval.endTime=${endTime}`;

    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        return reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`));
                    }
                    resolve(parsed);
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

function expandAbbrForTTS(text) {
    if (!text) return "";
    let processed = text
        .trim()
        .replace(/\bsth\b/gi, 'something')
        .replace(/\bsb\b/gi, 'somebody');
    if (processed && !/[.!?]$/.test(processed)) {
        processed += '.';
    }
    return processed;
}

async function main() {
    console.log("🔍 Fetching Google Cloud Chirp 3 / TTS usage report for project [pitter-patter-469708]...\n");

    const token = getAccessToken();

    // GCP Free tier resets at 00:00:00 UTC on the 1st of every calendar month
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

    const startTime = startOfMonth.toISOString();
    const endTime = now.toISOString();

    const requestFilter = 'metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.label.service="texttospeech.googleapis.com"';

    // Sum exact payload character counts from local state JSON files generated this month
    const audioDir = path.resolve(__dirname, '../../temp/audio');
    let exactLocalChars = 0;
    let localItemsCount = 0;

    if (fs.existsSync(audioDir)) {
        const files = fs.readdirSync(audioDir);
        files.forEach(f => {
            if (f.startsWith('chirp-') && f.endsWith('.json')) {
                const filePath = path.join(audioDir, f);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.mtime >= startOfMonth) {
                        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                        if (content.items && Array.isArray(content.items)) {
                            content.items.forEach(item => {
                                if (item["tts-done"] === 1 && item.text) {
                                    const speechPayload = expandAbbrForTTS(item.text);
                                    exactLocalChars += speechPayload.length;
                                    localItemsCount++;
                                }
                            });
                        }
                    }
                } catch (e) {}
            }
        });
    }

    try {
        const requestData = await fetchTimeSeries(token, requestFilter, startTime, endTime);

        let totalRequests = 0;
        if (requestData.timeSeries && Array.isArray(requestData.timeSeries)) {
            for (const ts of requestData.timeSeries) {
                if (ts.points && Array.isArray(ts.points)) {
                    for (const pt of ts.points) {
                        const val = parseInt(pt.value?.int64Value || "0", 10);
                        totalRequests += val;
                    }
                }
            }
        }

        const freeMonthlyLimit = 1000000;
        const usedChars = exactLocalChars > 0 ? exactLocalChars : totalRequests * 47;
        const isExact = exactLocalChars > 0;
        const percentUsed = ((usedChars / freeMonthlyLimit) * 100).toFixed(2);
        const remainingChars = Math.max(0, freeMonthlyLimit - usedChars);
        
        // Pricing after 1M free chars: $30 per 1,000,000 characters
        const billableChars = Math.max(0, usedChars - freeMonthlyLimit);
        const estimatedCostUSD = ((billableChars / 1000000) * 30).toFixed(2);

        const monthName = startOfMonth.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

        console.log("=================================================");
        console.log("📊 GOOGLE CLOUD CHIRP 3 / TTS USAGE REPORT");
        console.log("=================================================");
        console.log(`🔹 Project ID               : pitter-patter-469708`);
        console.log(`🔹 Billing Cycle            : ${monthName} (1st - Now, UTC)`);
        console.log(`🔹 Total API Requests       : ${totalRequests.toLocaleString()}`);
        console.log(`🔹 ${isExact ? 'Exact' : 'Estimated'} Chars Synthesized : ${usedChars.toLocaleString()} chars ${isExact ? '(from local logs)' : ''}`);
        console.log(`🔹 Free Monthly Quota       : 1,000,000 chars`);
        console.log(`🔹 Quota Used               : ${percentUsed}%`);
        console.log(`🔹 Remaining Free Quota     : ${remainingChars.toLocaleString()} chars`);
        console.log(`🔹 Pricing Rate             : $30.00 / 1,000,000 chars (after 1M free limit)`);
        console.log(`🔹 Est. Billable Cost       : $${estimatedCostUSD} USD`);
        console.log("=================================================\n");

    } catch (err) {
        console.error(`❌ Failed to fetch GCP monitoring report: ${err.message}`);
    }
}

main();
