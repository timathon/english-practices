#!/usr/bin/env node
/**
 * chirp.cjs (scripts/tts/chirp.cjs)
 * 
 * CLI tool for Google Cloud Text-to-Speech (Chirp 3 HD).
 * Generates audio files and automatically uploads them to Cloudflare R2 by default.
 * 
 * Usage:
 *   node scripts/tts/chirp.cjs <unit_directory_or_file_path> [flags]
 * 
 * Flags:
 *   --review, --report Generate standalone HTML review report & skip auto-upload for manual review.
 *   --no-upload        Skip uploading audio files to Cloudflare R2.
 *   --upload           Force upload (default).
 *   --batch <size>     Set concurrent request batch size (default: 5).
 *   --rpm <limit>      Set requests per minute limit (default: 50). Sleeps until next window when hit.
 *   --voice <name>     Fix voice name (default: rotates through Chirp 3 HD voices).
 *   --rate <speed>     Set speaking rate (default: 0.9 for EFL learner clarity).
 *   --regenerate       Force regeneration of all audios.
 *   --no-play          Skip auto-launching play-chirp web server after generation.
 *   --port <port>      Port for play-chirp server (default: 3300).
 * 
 * Examples:
 *   node scripts/tts/chirp.cjs v2-data/A8A/a8a-u8
 *   node scripts/tts/chirp.cjs v2-data/A8A/a8a-u8 --review
 *   node scripts/tts/chirp.cjs v2-data/A8A/a8a-u8 --no-upload --no-play
 */

const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const { runTtsSynthesis, uploadJobItems } = require('./tts-chirp.cjs');
const { generateHtmlPage } = require('./play-chirp.cjs');

async function main() {
    const args = process.argv.slice(2);
    const isReview = args.includes('--review') || args.includes('--report') || args.includes('--html');
    const forceRegenerate = args.includes('--regenerate');
    const noPlayFlag = args.includes('--no-play');
    const noUpload = args.includes('--no-upload') || isReview;

    let explicitVoice = null;
    const voiceIdx = args.indexOf('--voice');
    if (voiceIdx !== -1 && args[voiceIdx + 1]) {
        explicitVoice = args[voiceIdx + 1];
    }

    let batchSize = 5;
    const batchIdx = args.indexOf('--batch');
    if (batchIdx !== -1 && args[batchIdx + 1] && !isNaN(parseInt(args[batchIdx + 1], 10))) {
        batchSize = parseInt(args[batchIdx + 1], 10);
    }

    let rpmLimit = 50;
    const rpmIdx = args.indexOf('--rpm');
    if (rpmIdx !== -1 && args[rpmIdx + 1] && !isNaN(parseInt(args[rpmIdx + 1], 10))) {
        rpmLimit = parseInt(args[rpmIdx + 1], 10);
    }

    let speakingRate = 0.9;
    const rateIdx = args.indexOf('--rate');
    if (rateIdx !== -1 && args[rateIdx + 1] && !isNaN(parseFloat(args[rateIdx + 1]))) {
        speakingRate = parseFloat(args[rateIdx + 1]);
    }

    let port = 3300;
    const portIdx = args.indexOf('--port');
    if (portIdx !== -1 && args[portIdx + 1]) {
        port = parseInt(args[portIdx + 1], 10);
    }

    let targetHashes = null;
    const hashesIdx = args.indexOf('--hashes');
    if (hashesIdx !== -1 && args[hashesIdx + 1]) {
        targetHashes = new Set(args[hashesIdx + 1].split(',').map(h => h.trim()).filter(Boolean));
    }

    const valueFlags = new Set(['--voice', '--batch', '--rpm', '--rate', '--hashes', '--port']);
    const targetArg = args.find((a, idx) => {
        if (a.startsWith('--')) return false;
        if (idx > 0 && valueFlags.has(args[idx - 1])) return false;
        return true;
    });

    if (!targetArg) {
        console.error("Usage: node scripts/tts/chirp.cjs <unit_directory_or_file_or_chirp_json_path> [--review] [--no-upload] [--regenerate] [--voice <name>] [--batch <size>] [--rpm <limit>] [--rate <speed>] [--no-play]");
        process.exit(1);
    }

    // 1. Run synthesis
    const result = await runTtsSynthesis({
        targetPath: targetArg,
        explicitVoice,
        batchSize,
        rpmLimit,
        speakingRate,
        forceRegenerate,
        targetHashes
    });

    if (!result || !result.jobJsonPath) {
        console.log("No TTS job completed.");
        return;
    }

    // 2. Generate HTML report for audio review if --review / --report / --html is specified
    if (isReview) {
        const reportHtmlPath = result.jobJsonPath.replace(/\.json$/, '.html');
        const htmlContent = generateHtmlPage(result.jobState, path.basename(result.jobJsonPath), { isStatic: true });
        fs.writeFileSync(reportHtmlPath, htmlContent, 'utf8');
        console.log(`\n📄 Generated audio review HTML report: ${reportHtmlPath}`);

        try {
            const winPath = execSync(`wslpath -w "${reportHtmlPath}" 2>/dev/null`, { encoding: 'utf8' }).trim();
            if (winPath) {
                console.log(`🌐 Windows Path: ${winPath}`);
            }
        } catch (e) {}
        console.log(`ℹ️ Review mode active: Automatic upload deferred for review.\n   Review generated audio files before uploading via UI or running without --review.`);
    }

    // 3. Upload to Cloudflare R2 by default (unless --no-upload or --review is active)
    if (!noUpload) {
        await uploadJobItems(result.jobState, result.jobJsonPath, batchSize);
    }

    // 4. Auto-launch play-chirp server if requested or in review mode
    if (noPlayFlag) {
        console.log("ℹ️ --no-play flag specified. Skipping web server launch.");
        return;
    }

    console.log(`\n🌐 Auto-launching play-chirp showcase server...`);
    const playScript = path.resolve(__dirname, 'play-chirp.cjs');
    
    const playProcess = spawn('node', [playScript, result.jobJsonPath, '--port', String(port)], {
        stdio: 'inherit'
    });

    playProcess.on('error', (err) => {
        console.error(`❌ Failed to start play-chirp process: ${err.message}`);
    });
}

main().catch(err => {
    console.error(`❌ Fatal Error: ${err.message}`);
    process.exit(1);
});
