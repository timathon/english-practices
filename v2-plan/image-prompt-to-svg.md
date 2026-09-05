# Image Prompt to Optimized SVG Workflow

This guide details the standard procedure for converting visual prompts (e.g. `[*VISUAL: ...*]`) into lightweight, pixel-accurate embedded SVGs for practice and test sheets.

---

## 1. Context & Rationale

- In Listening / True-False questions, problems often have scanned image illustrations rather than text questions.
- Raw base64 PNGs are too large (~70–100 KB per item), which inflates JSON files and database storage.
- Pure manual vectorization can look artificial and lose textbook-authentic line art fidelity.
- **Solution**: Crop the exact illustration from the source scan/worksheet, convert it to grayscale WebP (~5–8 KB), and wrap it in a standard `<svg>` tag via `[HTML: <svg>...]`. This maintains 100% pixel fidelity while keeping JSON payloads compact.

---

## 2. Step-by-Step Workflow

### Step 1: Crop the Target Sub-Image

Using Python and `Pillow`, crop the target question illustration from the scanned image (excluding surrounding question numbers or answer parentheses if they are rendered by the UI):

```python
from PIL import Image

# Open high-resolution scanned sheet
img = Image.open('path/to/scanned_sheet.png')
w, h = img.size

# Crop bounding box: (left, top, right, bottom)
box = img.crop((left, top, right, bottom))
box.save('temp/cropped_q1.png')
```

### Step 2: Compress to Grayscale WebP

Convert to grayscale (`'L'`) and save as WebP with quality 70–75 to achieve maximum compression without visual degradation:

```python
import io
import base64
from PIL import Image

box = Image.open('temp/cropped_q1.png')

# Convert to grayscale and compress as WebP
buffer = io.BytesIO()
box.convert('L').save(buffer, format='WEBP', quality=75)

b64_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
data_uri = f'data:image/webp;base64,{b64_str}'

print(f'Payload size: {len(data_uri)} bytes')  # Typically ~5-8 KB
```

### Step 3: Wrap in SVG Container with `[HTML: ...]`

Embed the base64 data URI inside an `<svg>` with an `<image>` element. The UI's `renderPromptText()` detects the `[HTML: ...]` prefix and safely renders the SVG:

```python
width, height = box.size

svg_prompt = (
    f'[HTML: <svg viewBox="0 0 {width} {height}" width="{width}" height="{height}" '
    f'style="display:block; margin:8px auto; border-radius:8px; border:1px solid #e2e8f0;" '
    f'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n'
    f'  <image href="{data_uri}" x="0" y="0" width="{width}" height="{height}" />\n'
    f'</svg>]'
)
```

### Step 4: Update Practice JSON

Assign `svg_prompt` to the question's `prompt` property in the test sheet JSON:

```json
{
  "id": "q1d258dc",
  "prompt": "[HTML: <svg viewBox=\"0 0 196 216\" width=\"196\" height=\"216\" style=\"display:block; margin:8px auto; border-radius:8px; border:1px solid #e2e8f0;\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n  <image href=\"data:image/webp;base64,...\" x=\"0\" y=\"0\" width=\"196\" height=\"216\" />\n</svg>]",
  "audio": {
    "text": "He wants to buy a big birthday cake.",
    "maxReplays": 1
  },
  "answer": true,
  "translation": "他想买一个大生日蛋糕。",
  "explanation": "听力原文为: He wants to buy a big birthday cake. 与生日蛋糕图片一致。"
}
```

> **Important**: Keep all other question fields (`audio`, `answer`, `translation`, `explanation`) intact.

### Step 5: Seed & Verify

1. Run validation to ensure JSON integrity:
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('<path_to_json>', 'utf8'))"
   ```
2. Sync changes to local and remote DBs:
   ```bash
   npm run seed-v2
   ```
