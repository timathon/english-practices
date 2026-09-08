# High-Accuracy Test Sheet Image Extraction & SVG Workflow

This document outlines the standard high-accuracy procedure for detecting, cropping, optimizing, and embedding textbook test-sheet illustrations (`temp/xtz/*.jpg`) into test JSONs (`v2-data/*/*-test-*.json`).

---

## 1. Principles of High-Accuracy Extraction

1. **Tight Boundary Framing (No Unnecessary Borders/Margins)**:
   - **Boxed Grid Illustrations (e.g. Section 1 True/False, Section 7 Definition Matching)**: Crop exactly along the outer black rectangular frame lines. Do NOT include extraneous outer white margins, surrounding direction texts (e.g. `听录音，判断...`), adjacent question numbers, or answer bubble labels (`1. ( )`).
   - **Open Multi-Option Illustrations (e.g. Section 2 A/B/C options)**: Crop the complete illustration scene (e.g. include both sides of interacting characters, outer fences, full book spines) while strictly excluding the option letter labels (`A.`, `B.`, `C.`) and question prompts above/below.
2. **Deterministic Coordinate Detection**:
   - Use morphological line detection (`cv2.morphologyEx` / structural kernel line filtering) to identify grid and box frame edges.
   - Use dark pixel projections (`np.sum(sub < 120, axis=0/1)`) to locate outer box lines and avoid cutting through ink drawings or book spines.
3. **Payload Optimization**:
   - Convert cropped sub-images to grayscale (`'L'`).
   - Compress to WebP format (`quality=75`), which reduces payload to ~3–10 KB per SVG (compared to 70–100 KB for PNG base64).
   - Wrap the base64 string inside standard `<svg><image href="data:image/webp;base64,..."/></svg>` elements with a single-line `[HTML: <svg ...>...</svg>]` format.

---

## 2. Standard Extraction Workflow

### Step 1: Detect Box Frames or Image Ink Bounds

For boxed items (e.g. Section 1 or Section 7):
```python
import cv2
import numpy as np

gray = cv2.imread('temp/xtz/a6a-u2-test-xtzb-2.jpg', cv2.IMREAD_GRAYSCALE)

# Find exact outer black frame coordinates for a picture subregion
sub = gray[y1:y2, x1:x2]
h_line = np.where(np.sum(sub < 120, axis=1) > 80)[0]
v_line = np.where(np.sum(sub < 120, axis=0) > 80)[0]

top_y, bot_y = y1 + int(h_line.min()), y1 + int(h_line.max()) + 1
left_x, right_x = x1 + int(v_line.min()), x1 + int(v_line.max()) + 1
```

For open multi-option sections (e.g. Section 2 option images):
```python
from scripts.xtz.extract_test_svgs import get_ink_bounds

# Ensure all ink strokes of the target drawing are encompassed while omitting option letters A/B/C
x1, y1, x2, y2 = get_ink_bounds(gray, x1=320, y1=1530, x2=560, y2=1705, threshold=200, pad=2)
```

### Step 2: Export SVGs

Export crops directly into `temp/xtz/extracted-svgs/` with consistent naming conventions:
- Section 1 Prompts: `<unit>-test-xtzb-s1-q<N>.svg` (e.g. `a6a-u2-test-xtzb-s1-q1.svg`)
- Section 2 Options: `<unit>-test-xtzb-s2-q<N>-<opt>.svg` (e.g. `a6a-u2-test-xtzb-s2-q1-a.svg`)
- Section 7 Prompts: `<unit>-test-xtzb-s7-q<N>.svg` (e.g. `a6a-u2-test-xtzb-s7-q1.svg`)

```python
from PIL import Image
from scripts.xtz.extract_test_svgs import export_crop_as_svg

src_img = Image.open('temp/xtz/a6a-u2-test-xtzb-2.jpg')

# Export crop and get [HTML: ...] tag
tag = export_crop_as_svg(src_img, (1508, 1026, 1709, 1205), 'temp/xtz/extracted-svgs/a6a-u2-test-xtzb-s7-q1.svg')
```

### Step 3: Link in Test JSON

Update `v2-data/<grade>/<unit>/<unit>-test-*.json`:
- Replace question `prompt` strings with the Section 1 or Section 7 `[HTML: <svg>...]` tags.
- Replace question `options` arrays with the Section 2 `[HTML: <svg>...]` option tags.
- Preserve all listening `audio`, `answer`, `translation`, and `explanation` metadata intact.

```python
import json

with open('v2-data/A6A/a6a-u2/a6a-u2-test-xtzb.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update prompts / options
data['sections'][6]['questions'][0]['prompt'] = tag

with open('v2-data/A6A/a6a-u2/a6a-u2-test-xtzb.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```

---

## 3. Reusable Utility Module

The core reusable extraction functions are located in:
- [`scripts/xtz/extract_test_svgs.py`](file:///home/timathon/codes/smartedu/english-practices/scripts/xtz/extract_test_svgs.py)

Available helper functions:
- `detect_grid_lines(gray_img, y_range, x_range)`: Morphological detection of horizontal/vertical grid frames.
- `get_ink_bounds(gray_img, x1, y1, x2, y2, threshold, pad)`: Automatic edge finding around illustration ink.
- `export_crop_as_svg(src_img, box, output_path, quality)`: Crops, compresses to grayscale WebP (`quality=75`), writes `.svg` file, and formats `[HTML: <svg>...]`.
