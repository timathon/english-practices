# Wenyanwen Audio Processing Guide (Grade 7 Unit 2)

This document describes the workflow for processing and slicing the classical Chinese (Wenyanwen) audio for Grade 7 Semester 1 Unit 2 (陈太丘与友期行).

## Audio Sources and Segments

The primary audio file to be sliced is:
- **Source File**: `temp/audio/ctq/ctq.mp3`
- **Output Folder**: `temp/audio/ctq/output/`
- **Target Segments JSON**: `data/W7A/w7a-u2/w7a-u2-passage-decoder-s.json`

The segments generated correspond to the passage title followed by each sentence in the text. Each audio segment is named after the MD5 hash of its classical Chinese text:

| Index | Content | MD5 Hash File |
|---|---|---|
| 1 | 陈太丘与友期行 | `a77fe3d06d3ebacfd437248eb69f0bb5.mp3` |
| 2 | 陈太丘与友期行，期日中。 | `c65c614c2ec17cee8dd60a8feb1de59b.mp3` |
| 3 | 过中不至，太丘舍去，去后乃至。 | `8bac8355b253c07428a5b304f91e0c6c.mp3` |
| 4 | 元方时年七岁，门外戏。 | `797a4b5174ee5f718c097a2455ff8848.mp3` |
| 5 | 客问元方：“尊君在不？” | `50c088f0034cf742e90f25417441b8f3.mp3` |
| 6 | 答曰：“待君久不至，已去。” | `82b4e0fac888f0044f64dbd2a3255d18.mp3` |
| 7 | 友人便怒曰：“非人哉！与人期行，相委而去。” | `4a3c4a05d173e39f9398084290b494d3.mp3` |
| 8 | 元方曰：“君与家君期日中。日中不至，则是无信；对子骂父，则是无礼。” | `c4bbd407866bf6784a16762db5d01ef6.mp3` |
| 9 | 友人惭，下车引之。元方入门不顾。 | `cb16aba98d680b88f4b254a678e7c68e.mp3` |

## Integrated Slicing & Uploading Tool

A unified tool is located at `temp/audio/ctq/cut_ctq.cjs` to handle both slicing fine-tuning and uploading to Cloudflare R2 storage.

### 1. Interactive Audio Slicing Tuner
Run the following command to start the visual timing tuner:
```bash
node temp/audio/ctq/cut_ctq.cjs
```
- Open **`http://localhost:3013`** in your browser.
- Play the audio and set the Start/End markers for each segment.
- Saving an end-time will automatically cascade to update the next segment's start-time to maintain perfect continuity.
- Click **Save Timings & Cut Audio** to run `ffmpeg` locally and generate the `.mp3` files in the `output/` folder.

### 2. Uploading to Cloudflare R2
Once timings are saved and slices are generated, you can upload them to the CDN bucket (`embroid-001/ep/w7a/`) in two ways:
- **Via Web UI**: Click the green **Upload to Cloudflare R2** button at the top of the editor page.
- **Via CLI**: Run the script directly with the `--upload-only` flag:
  ```bash
  node temp/audio/ctq/cut_ctq.cjs --upload-only
  ```
