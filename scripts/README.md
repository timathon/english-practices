# Scripts & Automation

This folder contains the core automation logic for the English Practices platform, including release generators, audio processing utilities, and maintenance tools.

---

## 🚀 Release Generators

These scripts convert raw JSON content into production-ready, interactive HTML files.

### 1. Sentence Architect (`sa_release_gen.cjs`)
Generates sentence-building exercises with XOR encryption and integrated TTS.
- **Input:** `*-sentence-architect.json`
- **Template:** `templates/sa-shell-master.html`
- **Usage:** `node scripts/sa_release_gen.cjs` (Interactive)

### 2. Spelling Hero (`sh_release_gen.cjs`)
Creates interactive spelling challenges (Linear & Word Soup modes).
- **Input:** `*-spelling-hero.json`
- **Template:** `templates/sh-shell-master.html`
- **Usage:** `node scripts/sh_release_gen.cjs` (Interactive)

### 3. Vocab Master (`vm_release_gen.cjs`)
Generates vocabulary challenges with progress tracking and mistake review.
- **Input:** `*-vocab-master.json`
- **Template:** `templates/vm-shell-master.html`
- **Usage:** `node scripts/vm_release_gen.cjs` (Interactive)

### 4. Vocabulary Guide (`vg_release_gen.cjs`)
Produces print-optimized vocabulary guides with textbook references.
- **Input:** `*-vocab-guide.json`
- **Template:** `templates/vocab-guide.html`
- **Usage:** `node scripts/vg_release_gen.cjs` (Interactive)

### 5. Recall Map (`rm_release_gen.cjs`)
Converts hierarchical data into interactive mindmap/recall exercises.
- **Input:** `*-recall-map.json`
- **Template:** `templates/rm-shell-master.html`
- **Usage:** `node scripts/rm_release_gen.cjs` (Interactive)

---

## 🔊 Audio & TTS Utilities

Tools for handling speech synthesis and R2 storage.

- **`tts-gen-cut.cjs`**: Shared core utility for batch TTS (Gemini API) and automatic silence-based cutting (FFmpeg). Used by generators.
- **`tts-download.cjs`**: Downloads existing audio from R2 to local `temp/` for inspection or manual editing.
- **`upload_sfx.cjs`**: Utility to upload sound effects (correct/error) to the unified `ep/sfx/` folder.
- **`remove_bad_mp3.cjs`**: Helps identify and remove corrupted or unwanted audio files from local batches and R2.
- **`cut-audio.cjs`**: Manual utility for advanced audio splitting and trimming.

---

## 🛠 Maintenance Tools

- **`update_index.cjs`**: Automatically regenerates root and sub-folder `index.html` files to keep the exercise directory up to date.
- **`clean_release.cjs`**: Safely removes old builds from the `release/` directory to save space.
- **`batch-rename.cjs`**: Utility for normalizing filenames across the project.

---

## ⚙️ Configuration

### Dependencies
- **Node.js**: `v22+` recommended.
- **Python 3**: Required for `google-genai` TTS interface.
- **FFmpeg**: Essential for audio cutting and MP3 conversion.

### Environment Variables
Ensure these are set in your shell or `.env` file:
```bash
GOOGLE_API_KEY=your_key_here       # For Gemini TTS
AWS_ACCESS_KEY_ID=your_id_here     # For Cloudflare R2
AWS_SECRET_ACCESS_KEY=your_secret  # For Cloudflare R2
```

### Storage Structure (R2)
All audio is stored in a unified, normalized structure:
`ep/{book}/{md5_hash}.mp3`
*(Note: Book names are stripped of numeric suffixes like -1, -2 for global sharing)*
