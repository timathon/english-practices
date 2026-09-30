# TTS Studio Web App & Cloudflare Deployment Architecture

## 1. Overview & Architecture

TTS Studio is a standalone web application designed to run in modern browsers (including remote browsers) to generate TTS audio using Google Gemini API (`gemini-2.5-flash-preview-tts` and `gemini-3.1-flash-tts-preview`), visualize audio waveforms, allow interactive timestamp trimming/adjustment, cut and encode MP3 slices client-side via the Web Audio API + `lamejs`, and upload audio files directly to Cloudflare R2 (`embroid-001`).

```mermaid
graph LR
    subgraph Browser Client (TTS Studio Web)
        UI[TTS Studio Web UI]
        Auth[Passcode Gate]
        Parser[JSON / Text Task Extractor]
        DB[(IndexedDB Storage<br>History, Overrides, Config)]
        Waveform[Interactive Waveform Viewer<br>Canvas + Audio Slices]
        AudioEngine[Web Audio API Engine<br>Silence Detection & Trimming]
        Encoder[lamejs MP3 Encoder]
    end

    subgraph Cloudflare Edge (Worker / API)
        AuthCheck[Passcode Auth /api/auth]
        TTSProxy[Gemini TTS Proxy /api/tts]
        R2Uploader[R2 Direct Binding /api/upload]
    end

    subgraph External Cloud Services
        Gemini[Google Generative AI TTS API]
        R2[Cloudflare R2 Bucket: embroid-001]
    end

    UI -->|1. Passcode Check| AuthCheck
    UI <-->|Local State & History Persistence| DB
    UI -->|2. Batch Prompts + Key| TTSProxy
    TTSProxy -->|3. Outgoing Request| Gemini
    Gemini -->|4. Return PCM Audio| TTSProxy --> AudioEngine
    AudioEngine -->|5. Waveform & Silence Detection| Waveform
    Waveform -->|6. Timestamp Adjustments & Slicing| AudioEngine --> Encoder
    Encoder -->|7. Sliced MP3 Blobs| R2Uploader --> R2
```

---

## 2. Directory Structure (`tts/`)

```
tts/
├── api/
│   ├── package.json
│   ├── tsconfig.json
│   ├── wrangler.jsonc     # Cloudflare Worker config (routes: ttsapi.vibequizzing.com)
│   ├── .dev.vars          # Local development secrets (APP_PASSCODE, GOOGLE_API_KEY, etc.)
│   └── src/
│       └── index.ts       # Worker handling /api/auth, /api/tts proxy, and /api/upload to R2
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── wrangler.jsonc     # Cloudflare Pages deployment config (project: tts-web-studio)
│   └── src/
│       ├── index.css
│       ├── main.tsx
│       ├── App.tsx        # Main UI: Dashboard, configuration, queue table, R2 sync
│       ├── lib/
│       │   ├── parser.ts      # Task parser (JSON/plain text) + MD5 hashing
│       │   ├── audioCutter.ts # Web Audio silence detector, buffer trimmer & PCM decoder
│       │   ├── mp3Encoder.ts  # lamejs MP3 encoder
│       │   └── db.ts          # IndexedDB wrapper (history, overrides, timestamps, selections)
│       └── components/
│           └── WaveformViewer.tsx # Interactive canvas waveform preview & slice regions
├── plan/
│   └── ARCHITECTURE.md
└── package.json           # Workspace root scripts
```

---

## 3. Storage & Persistence (IndexedDB)

The web client stores all task sessions and user customizations in browser **IndexedDB** (`TTS_Studio_DB`), avoiding localStorage size limits:
- **`history` store**:
  - `id`: Unique record ID.
  - `name` / `book`: Unit/book namespace key (e.g., `a4a`, `sa1`).
  - `rawInput`: Original input payload.
  - `ttsOverrides`: Custom pronunciation text for Gemini TTS keyed by MD5 hash.
  - `timestamps`: Adjusted `startTime` / `endTime` slice coordinates.
  - `selectedMap`: Checked/unchecked upload state per item.
- **`settings` store**:
  - Remembers user passcode, custom API keys, and configuration preferences.

---

## 4. Key Pipeline Features

1. **Input Parsing & Multi-File / Folder Source Ingestion**:
   - **Interactive File/Folder Picker**: Select single files, multiple files, or entire unit directories via `Select File(s)` and `Select Folder`.
   - **Schema-Aware Audio Extraction (matching `tts-in-one.cjs`)**:
     - `*-vocab-guide.json`: extracts `context_sentence` and `word`.
     - `*-vocab-master.json`: extracts question `context_sentence`.
     - `*-spelling-hero.json`: extracts `word`.
     - `*-sentence-architect.json`: extracts sentence `en`.
     - `*-text-navigator.json`: extracts passage tree nodes and sections.
     - `*-passage-decoder-s.json`: extracts section sentences `en`.
     - `*-irregular-verbs.json` / `*-verb-expressions.json`: extracts `base`, `sentence`.
     - `*-test.json`: extracts `audio.text` from sections and questions.
   - **Automatic Filtering**: Automatically skips non-audio artifacts (`*-recall-map.json`, `*-grammar-wizard.json`, `tongjia.cjs`).
   - **Batch Partitioning**: Batches grouped by character count (default ~300 chars) or item count to respect model context and latency limits.
2. **Text for TTS Pronunciation Overrides**:
   - Allows inline editing of pronunciation text sent to Gemini while preserving original MD5 hashing for textbook compatibility.
3. **Interactive Waveform & Forward Re-alignment**:
   - Visual waveform viewer displaying silence intervals and sliced regions.
   - Per-item `Start Time (s)` and `End Time (s)` decimal adjustment with live interval audio preview.
   - **Analyze Audio** button to automatically recalculate timestamps from the edited point forward.
4. **Selective R2 Upload**:
   - Checkboxes per item (with Select All toggle) allowing selective cutting and uploading.
   - Direct upload to Cloudflare R2 bucket (`embroid-001`) under `ep/<bookName>/<hash>.mp3`.

---

## 5. Deployment & Secrets

- **Production API Worker**: `https://ttsapi.vibequizzing.com` / `https://tts-api.timathon-liu.workers.dev`
- **Production Web Studio**: `https://tts-web-studio.pages.dev`
- **Cloudflare Worker Secrets**:
  - `APP_PASSCODE`: Access gate secret.
  - `GOOGLE_API_KEY`: Default / paid tier Google Gemini API key.
  - `GOOGLE_API_KEY_FREE`: Free tier API key (optional).
  - `R2_BUCKET`: Direct Cloudflare R2 bucket binding to `embroid-001`.
