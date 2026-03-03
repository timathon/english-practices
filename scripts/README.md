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
- **Print Optimization:** Automatically switches to a compact 3-column grid during printing, maximizing space on A4 pages while hiding web-only UI elements.
- **Header Logic:** Displays a standard "Vocabulary Guide" title with the specific textbook `level` as a subtitle.
- **Navigation:** Includes a quick-access home link to `index.html`.

### 🛠 Usage

#### Interactive Mode
Run without arguments to select folders and `*-vocab-guide.json` files.
```bash
node scripts/vocab_release_gen.cjs
```

#### Direct Mode
```bash
node scripts/vocab_release_gen.cjs <input_json_path> <output_html_path>
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
- `templates/vocab-guide.html`: Layout for vocabulary guides.
- `data/`: Source JSON files.
- `release/`: Generated production HTML files.
- `temp/`: Temporary directory for audio processing.
