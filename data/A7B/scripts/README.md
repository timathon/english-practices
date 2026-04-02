# Scripts & Automation

This folder contains the core automation logic for the English Practices platform, including release generators, audio processing utilities, and maintenance tools.

---

## 🚀 Release Generators (V2 - Recommended)

These scripts utilize the unified `tts-gen-cut-save.cjs` module for robust audio generation with **RPM rate limiting (< 3 RPM)** and **punctuation isolation** (sentences with internal punctuation are processed individually to ensure perfect cutting).

### 1. Sentence Architect (`sa_release_gen-2.cjs`)
Generates sentence-building exercises with XOR encryption and integrated TTS.
- **Input:** `*-sentence-architect.json`
- **Template:** `templates/sa-shell-master.html`
- **Usage:** `node scripts/sa_release_gen-2.cjs` (Interactive)

### 2. Spelling Hero (`sh_release_gen-2.cjs`)
Creates interactive spelling challenges. All words in a unit are processed in one TTS batch for efficiency.
- **Input:** `*-spelling-hero.json`
- **Template:** `templates/sh-shell-master.html`
- **Usage:** `node scripts/sh_release_gen-2.cjs` (Interactive)

### 3. Vocab Master (`vm_release_gen-2.cjs`)
Generates vocabulary challenges with progress tracking and mistake review.
- **Input:** `*-vocab-master.json`
- **Template:** `templates/vm-shell-master.html`
- **Usage:** `node scripts/vm_release_gen-2.cjs` (Interactive)

### 4. Vocabulary Guide (`vg_release_gen-2.cjs`)
Produces print-optimized vocabulary guides with textbook references.
- **Input:** `*-vocab-guide.json`
- **Template:** `templates/vocab-guide.html`
- **Usage:** `node scripts/vg_release_gen-2.cjs` (Interactive)

### 5. Writing Map (`wm_release_gen.cjs`)
Converts hierarchical data into interactive mindmap trees. (Note: Currently no audio integration).
- **Input:** `*-writing-map-*.json`
- **Template:** `templates/wm-shell-master.html`
- **Usage:** `node scripts/wm_release_gen.cjs` (Interactive)

### 6. Recall Map (`rm_release_gen.cjs`)
Converts hierarchical data into interactive mindmap/recall exercises.
- **Input:** `*-recall-map.json`
- **Template:** `templates/rm-shell-master.html`
- **Usage:** `node scripts/rm_release_gen.cjs` (Interactive)

---

## 🔊 Audio & TTS Utilities

Tools for handling speech synthesis and R2 storage.

- **`tts-gen-cut-save.cjs`**: The **core unified utility** for batch TTS (Gemini API), automatic silence-based cutting (FFmpeg), and direct R2 upload. Optimized to skip silence detection for single-item batches.
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
*(Note: Book names are lowercase and stripped of numeric unit suffixes for global sharing)*
