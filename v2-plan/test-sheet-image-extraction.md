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

## 3. Standard Layout Geometry & Canonical Patterns

For standard 2-page test sheets (e.g., `temp/xtz/*-test-xtzb-1.jpg`):

### Section 1: True / False 2×5 Grid (Prompts Q1–Q10)
- **Location**: Top of Left Page.
- **Layout**: 2 rows × 5 columns enclosed in black rectangular borders.
- **Fast Auto-Detection**:
  ```python
  import cv2, numpy as np
  # Extract horizontal divider lines in y-band [650:1350]
  kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (80, 1))
  h_lines = cv2.morphologyEx(cv2.threshold(gray[650:1350, :], 200, 255, cv2.THRESH_BINARY_INV)[1], cv2.MORPH_OPEN, kernel)
  # Top row: y = (r1_top, r1_bot), Bottom row: y = (r2_top, r2_bot)
  # Vertical columns: 6 vertical border coordinates [x0, x1, x2, x3, x4, x5] (~235-240px wide per column)
  ```

### Section 2: Multiple Choice Options (Q1–Q5, Options A / B / C)
- **Location**:
  - **Left Page (Lower Half)**: Question 1 and Question 2.
  - **Right Page**: Question 3, Question 4, and Question 5.
- **3 Critical Bounding Box Rules**:
  1. **Top Badges & Title Banners**: Many illustrations contain title headers (e.g. *"Marco Polo"*, *"Zheng He"*), circular icons, or balloon badges at the top. **Always set search `y1` immediately below the question prompt text line** (the white gap where ink sum = 0) so top elements are never cut off.
  2. **Option Letters Exclusion**: `A.`, `B.`, `C.` labels sit at the bottom-left of each option. Start raw `x1` ~25–35px to the right of the letter base, or exclude the letter's bounding box below `y_split`.
  3. **Full Scene Wings**: Ensure `x2` covers background trees, mountain ranges, or extra figures on the right edge.

---

## 4. Reusable Utility Module & Batch Pipeline

The core reusable extraction functions are located in:
- [`scripts/xtz/extract_test_svgs.py`](file:///home/timathon/codes/smartedu/english-practices/scripts/xtz/extract_test_svgs.py)

Available helper functions:
- `detect_grid_lines(gray_img, y_range, x_range)`: Morphological detection of horizontal/vertical grid frames.
- `get_ink_bounds(gray_img, x1, y1, x2, y2, threshold, pad)`: Automatic edge finding around illustration ink.
- `export_crop_as_svg(src_img, box, output_path, quality)`: Crops, compresses to grayscale WebP (`quality=75`), writes `.svg` file, and formats `[HTML: <svg>...]`.

### Fast Batch Extraction Script Pattern
```python
import os, sys, json, cv2
from PIL import Image
from scripts.xtz.extract_test_svgs import get_ink_bounds, export_crop_as_svg

def process_test_sheet(src_jpg, json_path, s1_cfg, s2_boxes, unit_id):
    src_img = Image.open(src_jpg)
    gray = cv2.imread(src_jpg, cv2.IMREAD_GRAYSCALE)
    svg_dir = 'temp/xtz/extracted-svgs'
    os.makedirs(svg_dir, exist_ok=True)
    
    # 1. Export S1 (Q1-Q10)
    s1_tags = {}
    v_cols, r1_y, r2_y = s1_cfg['v_cols'], s1_cfg['r1_y'], s1_cfg['r2_y']
    for i in range(5):
        s1_tags[i+1] = export_crop_as_svg(src_img, (v_cols[i], r1_y[0], v_cols[i+1]+1, r1_y[1]+1), f"{svg_dir}/{unit_id}-s1-q{i+1}.svg")
        s1_tags[i+6] = export_crop_as_svg(src_img, (v_cols[i], r2_y[0], v_cols[i+1]+1, r2_y[1]+1), f"{svg_dir}/{unit_id}-s1-q{i+6}.svg")
    
    # 2. Export S2 (Q1-Q5, A/B/C)
    s2_tags = {}
    opts = ['a', 'b', 'c']
    for (q_idx, opt_idx), raw_box in s2_boxes.items():
        rx1, ry1, rx2, ry2 = get_ink_bounds(gray, raw_box[0], raw_box[1], raw_box[2], raw_box[3], threshold=200, pad=2)
        s2_tags[(q_idx, opt_idx)] = export_crop_as_svg(src_img, (rx1, ry1, rx2, ry2), f"{svg_dir}/{unit_id}-s2-q{q_idx}-{opts[opt_idx]}.svg")
        
    # 3. Update JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    s1 = next(s for s in data['sections'] if s.get('id') == 's1' or s.get('title', '').startswith('一'))
    s2 = next(s for s in data['sections'] if s.get('id') == 's2' or s.get('title', '').startswith('二'))
    for i, q in enumerate(s1['questions']): q['prompt'] = s1_tags[i+1]
    for i, q in enumerate(s2['questions']): q['options'] = [s2_tags[(i+1, 0)], s2_tags[(i+1, 1)], s2_tags[(i+1, 2)]]
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
```
