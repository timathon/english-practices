# 百莲阁 Classical Poetry AI Image Generation & Cropping Guide

This document establishes the prompt engineering standards, negative constraint rules, and cropping workflow for generating line illustrations for classical Chinese poems in the 知新堂 (ZXT) dataset.

---

## 1. Core Principles & Workflow

To maintain consistent artistic style, visual coherence, and character identity while reducing image generation costs by 75%:

1. **2x2 Master Storyboard Grid:** Generate a single 4-panel image (2x2 grid) per poem illustrating all 4 lines sequentially.
2. **Text-Free Requirement:** Images MUST NOT contain any Chinese text, titles, verse labels, or characters. They are used for image-to-text matching quizzes.
3. **1:1 Square Output Ratio:** Cropped panel assets must maintain a true 1:1 square aspect ratio (`400x400` px).
4. **Aggressive Inset Border Trimming (8%):** Apply an aggressive 8% margin slice during cropping to remove all black grid frame lines and paper margins.

---

## 2. Standardized Master Grid Prompt Architecture

When crafting prompts in `zxt/data/blg/poem-image-prompts.json`, strictly follow this 5-part prompt structure:

### `[1. Art Style & Base Texture]`
`Traditional Chinese ink wash painting (水墨国画), Song Dynasty guohua style, soft watercolor wash, delicate ink brushwork, rice paper texture (宣纸纹理), serene atmosphere.`

### `[2. Negative Constraints]`
`NO text, NO Chinese characters, NO labels, NO borders, NO black frame lines, seamless illustration artwork only.`

### `[3. Grid Layout Specification]`
`A 2x2 storyboard grid layout with 4 distinct sequential square panels separated by thin clean grid dividers:`

### `[4. Panel Action Descriptions (Sequential Storytelling)]`
- **Panel 1 (Top-Left):** Opening action and character introduction (e.g. punting pole `撑船竹竿`, NOT oars).
- **Panel 2 (Top-Right):** Precise physical action (e.g. plucking blooming white lotus flowers `白莲花`, NOT seed pods `莲蓬`).
- **Panel 3 (Bottom-Left):** Close-up facial expression & mood (e.g. joyful, innocent smiling expression, unaware of hiding trail).
- **Panel 4 (Bottom-Right):** Extreme wide landscape shot showing perspective and trail (e.g. boy facing away in far distance, continuous open water channel parting duckweed `浮萍一道开`).

### `[5. Color & Aesthetic Palette]`
`Harmonious aesthetic Song Dynasty color palette, minimalist Chinese landscape composition.`

---

## 3. Verified Benchmark Prompt Example (`Poem #1 池上`)

```text
Traditional Chinese ink wash painting (水墨国画), Song Dynasty guohua style, soft watercolor wash, delicate ink brushwork, rice paper texture (宣纸纹理), serene atmosphere. NO text, NO Chinese characters, NO labels, NO borders, NO black frame lines, seamless illustration artwork only. A 2x2 storyboard grid layout with 4 distinct sequential square panels separated by thin clean grid dividers: Top-Left (Panel 1): "小娃撑小艇" - A young Chinese child in traditional tunic standing in a small wooden boat, using a long bamboo pole (竹竿 / 撑船) pushing against the shallow riverbed to punt/propel the boat forward onto a lotus pond. NO wooden oars. Top-Right (Panel 2): "偷采白莲回" - The young child leaning over the boat's edge, actively plucking a blooming white lotus flower (白莲花) with his hands, harvested white lotus flowers inside the boat. NO lotus seed pods (莲蓬). Bottom-Left (Panel 3): "不解藏踪迹" - Close-up of the joyful child holding the long bamboo punting pole with a cheerful, innocent smiling facial expression, white lotus flowers clearly visible inside his boat. Bottom-Right (Panel 4): "浮萍一道开" - Extreme wide shot landscape of a vast calm pond covered in green floating duckweed (浮萍). NO tall lotus leaves or flowers in this panel. In the far distance, a tiny small boat is punting away with a long bamboo pole (boy's back facing viewer in far distance). A long, prominent, continuous open water channel extends from the foreground all the way to the tiny boat in the distance, cleanly parting the sea of green duckweed. Harmonious aesthetic color palette.
```

---

## 4. Cropping & Asset Pipeline

1. **Save Master Image:** Save generated master grid image to `zxt/data/blg/images/p{poem_id}_master.png`.
2. **Execute Python Cropper:**
   ```bash
   python3 zxt/scripts/crop_poem_grid.py zxt/data/blg/images/p{poem_id}_master.png {poem_id}
   ```
3. **Automated Output Assets:**
   - `zxt/web/public/assets/blg/poems/p{id}_l1.webp` (400x400 WebP)
   - `zxt/web/public/assets/blg/poems/p{id}_l2.webp` (400x400 WebP)
   - `zxt/web/public/assets/blg/poems/p{id}_l3.webp` (400x400 WebP)
   - `zxt/web/public/assets/blg/poems/p{id}_l4.webp` (400x400 WebP)
4. **Status Update:** The cropper script automatically updates `"status": "cropped"` in `zxt/data/blg/poem-image-prompts.json`.
