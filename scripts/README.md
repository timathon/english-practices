# Exercise Release Generator (`generate_release.cjs`)

This script automates the process of converting raw exercise content (JSON) into secure, obfuscated HTML files for production. It handles data encryption, Gemini-powered TTS generation, R2 cloud storage uploading, and automatic index generation.

## 🛠 Usage

### 1. Interactive Mode (Recommended)
Run the script without arguments to enter an interactive step-by-step wizard.
```bash
node scripts/generate_release.cjs
```
- Select multiple folders to batch process.
- Configure release type, user count, and validity.
- **Skip Audio:** Defaults to `yes`. Choose `no` if you need to generate new audio files.

### 2. Direct Mode
Generate a specific file immediately.
```bash
node scripts/generate_release.cjs <json_path> <type> <output_path> [--skip-audio]
```

### Parameters
1.  **`json_path`**: Path to the content JSON (e.g., `data/A3B/u1.json`).
2.  **`type`**:
    *   `post`: Requires authentication server request.
    *   `builtin`: Decryption key is embedded (Standalone).
3.  **`output_path`**: Destination HTML path.
4.  **`--skip-audio`** (Optional): Skips TTS and R2 upload, but keeps links in HTML.

## 🔑 Environment Variables
The following keys are required for full functionality (especially audio generation):
- `GOOGLE_API_KEY`: For Gemini 2.5 Flash TTS.
- `AWS_ACCESS_KEY_ID`: For R2 Storage access.
- `AWS_SECRET_ACCESS_KEY`: For R2 Storage access.

## 🎙 Audio System
- **Model:** `gemini-2.5-flash-preview-tts` (Voice: "Kore").
- **Storage:** MP3 files are uploaded to Cloudflare R2 (`embroid-001`).
- **Batching:** Processes 5 sentences in parallel.
- **Caching:** The script checks R2 for existing files before generating new ones to save API costs.
- **Temp Files:** Intermediate files are managed in the `/temp` directory and cleaned up automatically.

## 🔒 Security Model
1.  **ID_A**: A unique identifier. If missing in JSON, a valid one is generated automatically.
2.  **License Suffix**: Encodes user count and validity into the final `ID_A`.
3.  **Encryption**: Content is XOR-encrypted using a key derived from the final `ID_A` (djb2 hash).
4.  **Obfuscation**: Decryption logic is renamed to generic identifiers (`_0x4f2a`) in the output.

## 📁 System Components
- `templates/shell-post.html`: UI template for authenticated exercises.
- `templates/shell-builtin.html`: UI template for standalone exercises.
- `data/`: Source exercise JSON files.
- `release/`: Generated HTML files (organized by timestamp and type).
- `temp/`: Used for intermediate audio processing.

## 📝 Creating a New Exercise
1. Copy `templates/content-template.json` to a new folder in `data/`.
2. Fill in metadata and `challenges`.
3. Ensure `storageSuffix` is unique to prevent browser cache collisions.
4. Run the generator script.
