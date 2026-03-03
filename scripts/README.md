# Exercise Release Generator (`generate_release.cjs`)

This script automates the process of converting raw exercise content (JSON) into secure, obfuscated HTML files for production. It handles data encryption, Gemini-powered TTS generation, Cloudflare R2 cloud storage uploading, and modular template assembly.

## 🛠 Usage

### 1. Interactive Mode (Recommended)
Run the script without arguments to enter an interactive step-by-step wizard.
```bash
node scripts/generate_release.cjs
```
- Select multiple folders to batch process using spacebar.
- Configure release type, user count, and validity.
- **Audio Generation:**
    1. **Skip [default]:** Use existing R2 URLs without checking or generating files.
    2. **Generate missing only:** Checks R2 for existing files and only generates what's missing.
    3. **Regenerate all:** Overwrites all existing audio in R2.

### 2. Direct Mode
Generate a specific file immediately.
```bash
node scripts/generate_release.cjs <json_path> <type> <output_path> [--skip-audio|--regenerate]
```

### Parameters
1.  **`json_path`**: Path to the content JSON (e.g., `data/A3B/u1.json`).
2.  **`type`**: 
    *   `post`: Standard release requiring server-side authentication.
    *   `builtin`: Standalone release with embedded key.
3.  **`output_path`**: Destination HTML path. If it starts with `release/`, it will be nested under a timestamped folder.
4.  **`--skip-audio`**: Skips TTS generation and R2 upload.
5.  **`--regenerate`**: Forces regeneration of all audio files.

## 🛠 System Dependencies
Required for audio generation and processing:
- `python3`: With `google-genai` (and `google-cloud-texttospeech` for fallback).
- `ffmpeg`: For converting WAV output to optimized MP3.

## 🔑 Environment Variables
Required for full functionality (especially audio generation):
- `GOOGLE_API_KEY`: For Gemini 2.5 Flash TTS.
- `AWS_ACCESS_KEY_ID`: For Cloudflare R2 access.
- `AWS_SECRET_ACCESS_KEY`: For Cloudflare R2 access.

## 🎙 Audio & SFX System
- **TTS Model:** `gemini-2.5-flash-preview-tts` (Voice: "Kore"), with fallback to Google Cloud TTS (`en-US-Chirp3-HD-Kore`).
- **Storage:** MP3s are stored in Cloudflare R2 (`embroid-001`). 
- **Deterministic Paths:** URLs are derived from the MD5 hash of the English text. This ensures links never break, even if the generator script is re-run with `--skip-audio`.
- **Offline Caching:** The client-side app automatically caches all audio (Sentence TTS + SFX) in `localStorage` as Base64.

## 🔒 Security Model
1.  **ID_A**: A unique identifier with a checksum (sum of 7 digits must be divisible by 7).
2.  **License Suffix**: Encodes user count and validity (months) into a 2-character suffix added to `ID_A`.
3.  **Encryption:** Content is XOR-encrypted using a key derived from the final `ID_A` (djb2 hash).

## 📁 System Components
- `templates/shell-master.html`: Core UI and game logic.
- `templates/fragments/`: Modular authentication logic (`post.html`, `builtin.html`).
- `data/`: Source exercise JSON files.
- `release/`: Generated production HTML files. The script automatically rebuilds `index.html` files for navigation within the release directory.
- `temp/`: Temporary directory for intermediate TTS and audio processing files.

## 📝 Creating a New Exercise
1. Copy `templates/content-template.json` to a new folder in `data/`.
2. Fill in metadata and `challenges`.
3. Run `node scripts/generate_release.cjs`.
4. Verify the build in the `release/` directory.
