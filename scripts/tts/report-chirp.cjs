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

async function main() {
    console.log("🔍 Fetching Google Cloud Chirp/TTS usage report for project [pitter-patter-469708]...\n");

    const token = getAccessToken();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startTime = thirtyDaysAgo.toISOString();
    const endTime = now.toISOString();

    const requestFilter = 'metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.label.service="texttospeech.googleapis.com"';

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

        // Average length estimate based on generated items (~47 chars per request)
        const estimatedChars = totalRequests * 47;
        const freeMonthlyLimit = 1000000;
        const percentUsed = ((estimatedChars / freeMonthlyLimit) * 100).toFixed(2);
        const remainingChars = Math.max(0, freeMonthlyLimit - estimatedChars);

        console.log("=================================================");
        console.log("📊 GOOGLE CLOUD CHIRP 3 / TTS USAGE REPORT");
        console.log("=================================================");
        console.log(`🔹 Project ID               : pitter-patter-469708`);
        console.log(`🔹 Time Interval            : Past 30 Days`);
        console.log(`🔹 Total API Requests       : ${totalRequests.toLocaleString()}`);
        console.log(`🔹 Estimated Chars Used     : ~${estimatedChars.toLocaleString()} chars`);
        console.log(`🔹 Free Monthly Quota       : 1,000,000 chars`);
        console.log(`🔹 Quota Used               : ${percentUsed}%`);
        console.log(`🔹 Remaining Free Quota     : ~${remainingChars.toLocaleString()} chars`);
        console.log("=================================================\n");

    } catch (err) {
        console.error(`❌ Failed to fetch GCP monitoring report: ${err.message}`);
    }
}

main();
