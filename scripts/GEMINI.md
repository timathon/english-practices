# Scripts Operational Guide

This document records specific operational patterns and commands for the scripts in this folder, ensuring future agents can run them without needing to read the source code.

---

## 📋 General Rules & Arguments
For V3 release generators (`vm_release_gen-3.cjs`, `sh_release_gen-3.cjs`, `sa_release_gen-3.cjs`):
- **Validation Type (`type`)**: `post` (default, URL parameter verification) or `builtin` (local activation key validation).
- **Users**: `--user=X` (defaults to 3, use 10 for interactive packages as per sequence.md).
- **Validity**: `--validity=Y` (months, defaults to 3).
- **Audio Modes**:
  - `--skip-audio` (force audioMode = '1', skips TTS tasks completely, ideal for local tests or non-audio runs).
  - `--regenerate` (force audioMode = '3', regenerates all TTS assets).
  - *(Default)* (audioMode = '2', checks Cloudflare R2 and only requests missing audio via Gemini API).

---

## 🗺 Recall Map Generation (`rm_release_gen.cjs`)
Converts recall map JSON data into a formatted interactive HTML mindmap.
```bash
node scripts/rm_release_gen.cjs [input_json_path] [output_html_path]
```
**Example:**
```bash
node scripts/rm_release_gen.cjs data/RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-recall-map.json RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-recall-map.html
```

---

## 📖 Vocabulary Guide Generation (`vg_release_gen-3.cjs`)
Generates printable/web vocab guides with integrated speech/phonics support.
```bash
node scripts/vg_release_gen-3.cjs [input_json_path] [output_html_path] [flags]
```
**Example (No Audio):**
```bash
node scripts/vg_release_gen-3.cjs data/RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-vocab-guide.json RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-vocab-guide.html --skip-audio
```

---

## 🧠 Vocab Master Generation (`vm_release_gen-3.cjs`)
Generates multi-choice and cloze vocabulary practice challenges.
```bash
node scripts/vm_release_gen-3.cjs [input_json_path] [type] [output_html_path] [flags]
```
**Example (Builtin Key, 10 Users, 3 Months, Skip Audio):**
```bash
node scripts/vm_release_gen-3.cjs data/RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-vocab-master.json builtin RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-vocab-master.html --user=10 --validity=3 --skip-audio
```

---

## 🔠 Spelling Hero Generation (`sh_release_gen-3.cjs`)
Creates interactive spelling/chunking challenges.
```bash
node scripts/sh_release_gen-3.cjs [input_json_path] [type] [output_html_path] [flags]
```
**Example (Builtin Key, 10 Users, 3 Months, Skip Audio):**
```bash
node scripts/sh_release_gen-3.cjs data/RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-spelling-hero.json builtin RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-spelling-hero.html --user=10 --validity=3 --skip-audio
```

---

## 🧱 Sentence Architect Generation (`sa_release_gen-3.cjs`)
Generates sentence block builder interfaces with encryption.
```bash
node scripts/sa_release_gen-3.cjs [input_json_path] [type] [output_html_path] [flags]
```
**Example (Builtin Key, 10 Users, 3 Months, Skip Audio):**
```bash
node scripts/sa_release_gen-3.cjs data/RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-sentence-architect.json builtin RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-sentence-architect.html --user=10 --validity=3 --skip-audio
```

---

## 🧭 Writing Map & Text Navigator Generation (`wm_release_gen-3.cjs`)
Generates structured writing mapping templates or interactive paragraph/dialogue navigation flows.
```bash
node scripts/wm_release_gen-3.cjs [input_json_path] [output_html_path] [flags]
```
**Example (No Audio):**
```bash
node scripts/wm_release_gen-3.cjs data/RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-text-navigator.json RAZ-B/raz-b-all-by-myself/raz-b-all-by-myself-text-navigator.html --skip-audio
```

---

## 🛠 Maintenance & Indexing
Always rebuild the index and data catalog after generating new releases:
```bash
node scripts/update_index.cjs
```

---

## 🎙 On-Demand TTS Generation (`tts-for-sentences.cjs`)
Generates TTS for a specific list of sentences and uploads them to R2 under a specified textbook category.
```bash
node scripts/tts-for-sentences.cjs [book_name] [sentences_file_or_string] [flags]
```
- **book_name**: The category name (e.g., `a3b`, `raz-b`) used for the R2 key prefix.
- **sentences_file_or_string**: Either a path to a `.txt` file (one sentence per line) or a `\n`-separated string.
- **Flags**:
  - `--no-upload`: Skip R2 upload, save files locally only in `temp/audio/`.
  - `--regenerate`: Force regeneration even if files might exist (handled by `getAudioBatch`).

**Example (String):**
```bash
node scripts/tts-for-sentences.cjs a3b "Hello world.\nThis is a test."
```

**Example (File):**
```bash
node scripts/tts-for-sentences.cjs a3b temp/my-sentences.txt
```

---

## 📊 TTS Generation HTML Reports & Duration Validation
When running `tts-in-one.cjs` or `tts-for-sentences.cjs`, an HTML report is generated at `temp/audio/tts-report-[timestamp].html` once processing is complete.

The report includes:
- **Batch Details & Status**: Overview of generated audio files and upload status.
- **Duration Validation**: Shows the actual MP3 length (via `ffprobe`) alongside an estimated length based on word count (`wordCount * 0.35 + 0.5` seconds).
- **Outlier Warning**: Files are flagged red (using the `.bad-duration` style class) if the actual duration falls outside the expected range (`duration < estMin` or `duration > estMax`), where:
  - `estMin = Math.max(0.2, wordCount * 0.15)`
  - `estMax = Math.max(3.0, wordCount * 0.9 + 2.0)`
- **Audio Previews**: Integrated audio elements for quick validation before deployment.

