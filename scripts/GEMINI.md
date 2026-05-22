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

