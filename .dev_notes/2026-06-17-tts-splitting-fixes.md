# TTS Audio Splitting Fixes

**Date:** 2026-06-17  
**Files:** `scripts/tts-gen-cut-save-3.cjs`, `scripts/tts-in-one.cjs`

---

## Background

`tts-gen-cut-save-3.cjs` generates a combined WAV from the Gemini TTS model containing all batch sentences separated by `[BREAK]` markers, then splits it into individual MP3s using `ffmpeg` silence detection.

Three bugs were discovered and fixed during testing on `data/RAZ-B/raz-b-b/raz-b-beach-fun`.

---

## Bug 1 — First sentence repeated in two tones ("heading" repetition)

**Symptom:** The combined WAV contained the first sentence spoken twice — once in a neutral tone (as a heading) and again as the first list item.

**Cause:** The TTS model received the text as:
```
Text to read:
We swim at the beach. [BREAK] We dig at the beach. [BREAK] ...
```
The first sentence immediately followed the instruction label, so the model treated it as a title and read it once as context, then again as item 1.

**Fix:** Prepend a short warmup sentence (`"Start."`) to every batch:
```js
const WARMUP = 'Start.';
const combinedText = [WARMUP, ...ttsSentences].join(separator) + separator;
```
The warmup is always spoken (unlike a leading `[BREAK]` which the model can ignore), occupying the "heading" position. The warmup segment is discarded during cutting.

---

## Bug 2 — Off-by-one: every split file had the wrong sentence

**Symptom:** All split files were shifted by one — file 0 sounded like sentence 1, file 1 like sentence 2, etc.

**Cause (original scheme, no warmup):** The combined WAV started with a brief silence at `t≈0`. The silence detection filter `s.start > 0.1` was intended to exclude it, but failed when the silence actually started at `t=0.69s` in one run. More critically, when the old "top-N by duration" approach included this early silence as `silences[0]`, the cutting `startTime` was set to the midpoint of a silence that should have been the *first inter-sentence* boundary, not the pre-speech silence.

**Fix (two parts):**

1. The warmup sentence (Bug 1 fix) ensures `silences[0]` is always the silence *after* `"Start."`, starting at `t > 1s` — well past the `0.1s` filter. No extra early silence can displace a real boundary.

2. Cutting now expects **N+1 silences** (1 after warmup + N after sentences) and uses `silences[0]` as `startTime`:
```js
let startTime = silences[0] ? (silences[0].start + silences[0].end) / 2 : 0;
for (let i = 0; i < tasks.length; i++) {
    const s = silences[i + 1]; // silences[0] = warmup; [1..N] = sentence boundaries
    const endTime = s ? (s.start + s.end) / 2 : 99999;
    // cut [startTime, endTime] → sentence i
    startTime = endTime;
}
```

---

## Bug 3 — Merged segment: one file 12 seconds long, subsequent files wrong

**Symptom:** The file for "We eat at the beach." was 12 seconds and contained two sentences merged together. All subsequent files were shifted.

**Cause:** The TTS model generated only a **1.66s pause** between two sentences instead of the expected ~4s `[BREAK]`. The silence detection with `d=0.8` picked it up as a valid separator. The "top-N+1 by duration" selection included it, causing the cut boundary to be placed mid-sentence and the next real `[BREAK]` (5.23s) to serve as the boundary for two sentences combined.

**Fix:** Raise the `silencedetect` minimum duration from `d=0.8` to `d=2.0`:
```js
// d=2.0: only detect silences ≥ 2s. Genuine [BREAK] markers generate ~4s silences;
// shorter pauses are intra-sentence breaths or failed [BREAK]s.
const silenceOutput = execSync(`ffmpeg -i "${combinedWav}" -af "silencedetect=n=${silenceThreshold}:d=2.0" ...`);
```
With `d=2.0`, a 1.66s rogue pause is not detected. The candidate count drops below `tasks.length`, triggering an automatic retry. On retry, the TTS model generates proper `[BREAK]` silences throughout.

---

## Silence Selection Algorithm (final)

After the warmup fix, the original "top-N by duration" approach is again reliable (the early-silence displacement problem no longer exists). Selection is now **top-(N+1) by duration**, re-sorted by start time:

```js
const silencesCount = tasks.length + 1; // N+1: 1 after warmup + N after sentences
const silences = candidateSilences
    .map(s => ({ ...s, duration: s.end - s.start }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, silencesCount)
    .sort((a, b) => a.start - b.start);
```

The greedy `minGap` approach (tried briefly) was abandoned because it dropped valid silences when two consecutive sentences were short enough that their trailing silences were closer than `minGap`.

---

## Report Generation (`tts-in-one.cjs`)

- `--no-upload` flag: skips R2 upload, saves MP3s locally only.
- HTML report: generated after each run in `temp/audio/tts-report-{timestamp}.html`.
  - Dark-themed table with Batch ID, Sentence, Hash (8-char preview + full hash on hover), Status badge, and inline `<audio>` player.
  - Audio `src` paths are relative to the HTML file (e.g. `batch_{id}/{hash}.mp3`).
- Temp files (`batch_{id}_tts.py`, `batch_{id}_py.log`) are now preserved in the batch subfolder alongside the combined WAV for debugging.

---

## Update (2026-06-19) — Hardcoded Silence Removal Threshold Bug

**Symptom:** Cut MP3 segments had excessive leading/trailing silences (e.g., actual speaking duration was ~2s, but the MP3 was over 5s).

**Cause:** The `silenceremove` filter in the ffmpeg command had a hardcoded threshold of `-35dB`. In cases where the Gemini TTS output possessed a slightly higher noise floor (e.g., `-33dB`), the filter would fail to trigger, leaving the silence un-trimmed.

**Fix:** Modified the `ffmpeg` calls in `scripts/tts-gen-cut-save-3.cjs` to use the dynamic `silenceThreshold` variable (which defaults to `-30dB`) instead of a hardcoded `-35dB`. This aligns the trimming threshold with the silence detection threshold.

---

## Update (2026-06-19) — Audio Gating to Combat Background Hiss/Noise

**Symptom:** Split boundaries were incorrect or missed entirely (resulting in merged sentences or extremely short/empty files like `8d788385431273d11e8b43bb78f3aa41.mp3`) because background hiss/breaths during pause gaps exceeded the `-30dB` silence threshold.

**Cause:** The Google TTS engine output sometimes has a noise floor (hiss/breaths) around `-28dB` to `-30dB`. This noise prevented `silencedetect` and `silenceremove` from recognizing the silent periods properly.

**Fix:** Integrated `ffmpeg`'s audio gate filter (`agate`) into the processing chain before running silence detection and trimming. The gate is configured to suppress any audio below `-32dB` down to digital zero (`-60dB`), ensuring silent periods are perfectly silent:
```js
-af "agate=threshold=-32dB:ratio=10:range=-60dB,silencedetect=..."
```
This cleans up background hiss and guarantees reliable boundary detection.

