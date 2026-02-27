# Exercise Release Generator (`generate_release.cjs`)

This script automates the process of converting raw exercise content (JSON) into secure, obfuscated HTML files for production. It handles data encryption, Gemini-powered TTS generation, Cloudflare R2 cloud storage uploading, and modular template assembly.

## 🛠 Usage

### 1. Interactive Mode (Recommended)
Run the script without arguments to enter an interactive step-by-step wizard.
```bash
node scripts/generate_release.cjs
```
- Select multiple folders to batch process.
- Configure release type, user count, and validity.
- **Skip Audio:** Defaults to `yes`. Choose `no` only if you need to generate new audio files for text that has changed.

### 2. Direct Mode
Generate a specific file immediately.
```bash
node scripts/generate_release.cjs <json_path> <type> <output_path> [--skip-audio]
```

### Parameters
1.  **`json_path`**: Path to the content JSON (e.g., `data/A3B/u1.json`).
2.  **`type`**: 
    *   `post`: Standard release requiring server-side authentication.
    *   `builtin`: Standalone release with embedded key.
3.  **`output_path`**: Destination HTML path.
4.  **`--skip-audio`** / **`-s`**: Skips TTS generation and R2 upload. Links remain valid due to deterministic hashing.

## 🔑 Environment Variables
Required for full functionality (especially audio generation):
- `GOOGLE_API_KEY`: For Gemini 2.5 Flash TTS.
- `AWS_ACCESS_KEY_ID`: For Cloudflare R2 access.
- `AWS_SECRET_ACCESS_KEY`: For Cloudflare R2 access.

## 🎙 Audio & SFX System
- **TTS Model:** `gemini-2.5-flash-preview-tts` (Voice: "Kore").
- **Storage:** MP3s are stored in Cloudflare R2 (`embroid-001`). 
- **Deterministic Paths:** URLs are derived from the MD5 hash of the English text. This ensures links never break, even if the generator script is re-run with `--skip-audio`.
- **Offline Caching:** The client-side app automatically caches all audio (Sentence TTS + SFX) in `localStorage` as Base64.
- **SFX:** Integrated "Correct" and "Wrong" sound effects with adjustable settings and 200ms audio layering delay.

## 🔒 Security Model
1.  **ID_A**: A unique identifier with a checksum (sum % 7 == 0).
2.  **License Suffix**: Encodes user count and validity (months) into a 2-character suffix added to `ID_A`.
3.  **Encryption:** Content is XOR-encrypted using a key derived from the final `ID_A` (djb2 hash).
4.  **Obfuscation:** Decryption logic and UI rendering are minimally obfuscated in the final output.

## 📁 System Components
- `templates/shell-master.html`: Core UI and game logic.
- `templates/fragments/`: Modular authentication logic (`post.html`, `builtin.html`).
- `data/`: Source exercise JSON files.
- `release/`: Generated production HTML files.
- `temp/`: Temporary directory for intermediate TTS and audio processing files.

## 📝 Creating a New Exercise
1. Copy `templates/content-template.json` to a new folder in `data/`.
2. Fill in metadata and `challenges`.
3. Run `node scripts/generate_release.cjs`.
4. Verify the build in the `release/` directory.
