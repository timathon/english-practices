# Release Generators

This folder contains scripts to automate the process of converting raw exercise and vocabulary content (JSON) into production-ready HTML files.

---

## 1. Sentence Architect Generator (`sentence_release_gen.cjs`)

Automates the creation of secure, obfuscated HTML files for sentence building exercises. Handles data encryption, Gemini-powered TTS generation, and Cloudflare R2 uploading.

### 🛠 Usage

#### Interactive Mode (Recommended)
Run without arguments to enter an interactive wizard. Filters for `*-sentence-architect.json` files.
```bash
node scripts/sentence_release_gen.cjs
```

#### Direct Mode
Generate a specific file immediately.
```bash
node scripts/sentence_release_gen.cjs <json_path> <type> <output_path> [--skip-audio|--regenerate]
```

---

## 2. Vocabulary Guide Generator (`vocab_release_gen.cjs`)

Converts vocabulary JSON data into a formatted, print-optimized HTML guide using `templates/vocab-guide.html`.

### ✨ Key Features
- **Interactive Sorting:** Includes a floating toggle to switch between "Textbook Order" and "Alphabetical (A-Z) Order".
- **Batch TTS Audio:** Automatically generates high-quality audio for context sentences using Gemini 2.5 Flash (processed in batches of 10).
- **Audio Caching:** Implements background preloading and Base64 `localStorage` caching for instant, offline-ready playback.
- **Clean HTML:** Uses a state-driven audio system where URLs are managed via injected JSON, keeping the DOM structure minimal.
- **Print Optimization:** Automatically switches to a compact 3-column grid during printing, maximizing space on A4 pages while hiding web-only UI elements.
- **Textbook Context:** Displays "Page Number" badges (e.g., P9) to link vocabulary back to physical textbook materials.

### 🛠 Usage

#### Interactive Mode
Run without arguments to select folders and `*-vocab-guide.json` files. Includes prompts for audio generation modes (Skip, Missing, Regenerate).
```bash
node scripts/vocab_release_gen.cjs
```

#### Direct Mode
```bash
node scripts/vocab_release_gen.cjs <input_json_path> <output_html_path> [--skip-audio|--regenerate]
```

---

## 3. Vocab Master Generator (`vm_release_gen.cjs`)

Generates interactive vocabulary challenge HTML files (Cloze, Cn2En, En2Cn) based on `*-vocab-master.json` files.

### ✨ Key Features
- **Interactive Challenges:** Supports three question types: Cloze (fill in the blank), Cn2En (select English), and En2Cn (select Chinese meaning).
- **Security:** Obfuscates exercise data using XOR encryption and unique `ID_A` generation.
- **Batch TTS Audio:** Automatically generates audio for context sentences in batches using Gemini 2.5 Flash.
- **Progress Tracking:** Includes a visual progress bar and persists lifetime/best score statistics in `localStorage`.
- **Review System:** Automatically logs mistakes for later review by students.
- **Controlled Flow:** Implements a 2-second delay on the "Continue" button after checking an answer to ensure students read the feedback.

### 🛠 Usage

#### Interactive Mode
Run without arguments to select folders and `*-vocab-master.json` files.
```bash
node scripts/vm_release_gen.cjs
```

#### Direct Mode
```bash
node scripts/vm_release_gen.cjs <json_path> <type> <output_path> [--skip-audio|--regenerate]
```

---

## 🛠 System Dependencies
Required for audio generation and processing:
- `python3`: With `google-genai`.
- `ffmpeg`: For MP3 conversion.

## 🔑 Environment Variables
Required for full functionality:
- `GOOGLE_API_KEY`: For Gemini 2.5 Flash TTS.
- `AWS_ACCESS_KEY_ID`: For Cloudflare R2 access.
- `AWS_SECRET_ACCESS_KEY`: For Cloudflare R2 access.

## 📁 System Components
- `templates/shell-master.html`: Core UI for sentence exercises.
- `templates/vm-shell-master.html`: Interactive UI for vocabulary challenges.
- `templates/vocab-guide.html`: Layout for vocabulary guides.
- `data/`: Source JSON files.
- `release/`: Generated production HTML files.
- `temp/`: Temporary directory for audio processing.
