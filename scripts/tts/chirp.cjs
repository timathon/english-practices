/**
 * chirp.cjs (scripts/tts/chirp.cjs)
 * 
 * CLI tool for Google Cloud Text-to-Speech (Chirp 3 HD).
 * Generates audio files and then automatically spins up play-chirp.cjs web server.
 * 
 * Usage:
 *   node scripts/tts/chirp.cjs <unit_directory_or_file_path> [flags]
 * 
 * Flags:
 *   --batch <size> Set concurrent request batch size (default: 5).
 *   --voice <name> Fix voice name (default: rotates through 30 Chirp 3 HD voices).
 *   --rate <speed> Set speaking rate (default: 0.9 for EFL learner clarity).
 *   --regenerate   Force regeneration of all audios.
 *   --no-play      Skip auto-launching play-chirp web server after generation.
 *   --port <port>  Port for play-chirp server (default: 3300).
 * 
 * Examples:
 *   node scripts/tts/chirp.cjs v2-data/A8A/a8a-u8
 *   node scripts/tts/chirp.cjs v2-data/A8A/a8a-u8/a8a-u8-vocab-guide.json --batch 10 --rate 0.9
 *   node scripts/tts/chirp.cjs v2-data/A8A/a8a-u8 --voice Kore
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { runTtsSynthesis } = require('./tts-chirp.cjs');

async function main() {
    const args = process.argv.slice(2);
    const forceRegenerate = args.includes('--regenerate');
    const noPlayFlag = args.includes('--no-play');

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

    const targetArg = args.find(a => !a.startsWith('--') && 
        (args[args.indexOf(a) - 1] !== '--voice') && 
        (args[args.indexOf(a) - 1] !== '--batch') && 
        (args[args.indexOf(a) - 1] !== '--rate') && 
        (args[args.indexOf(a) - 1] !== '--hashes') && 
        (args[args.indexOf(a) - 1] !== '--port'));

    if (!targetArg) {
        console.error("Usage: node scripts/tts/chirp.cjs <unit_directory_or_file_or_chirp_json_path> [--regenerate] [--voice <name>] [--batch <size>] [--rate <speed>] [--no-play]");
        process.exit(1);
    }

    // 1. Run synthesis
    const result = await runTtsSynthesis({
        targetPath: targetArg,
        explicitVoice,
        batchSize,
        speakingRate,
        forceRegenerate,
        targetHashes
    });

    if (!result || !result.jobJsonPath) {
        console.log("No TTS job completed.");
        return;
    }

    if (noPlayFlag) {
        console.log("ℹ️ --no-play flag specified. Skipping web server launch.");
        return;
    }

    // 2. Auto-launch play-chirp server
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
