# 知新堂 (ZXT) - 百莲阁 Classical Poetry Dataset Standard & Schema Guide

This document defines the schema rules, exercise type definitions, and image asset standards for classical poetry exercise datasets.

---

## 1. Top-Level Poem Object Schema (`poems-75.json`)

Each poem item in `zxt/data/blg/poems-75.json` contains runtime references without heavy generator metadata:

```json
{
  "id": 1,
  "title": "池上",
  "dynasty": "唐",
  "author": "白居易",
  "theme": "童趣 (Childhood Innocence)",
  "keywords": ["小娃", "白莲", "浮萍"],
  "lines": [
    {
      "text": "小娃撑小艇",
      "pinyin": "xiǎo wá chēng xiǎo tǐng",
      "cn": "小娃撑着小船",
      "en": "A young child rows a small boat,",
      "image": "/assets/blg/poems/p1_l1.webp"
    }
  ],
  "questions": [...]
}
```

---

## 2. 2x2 Master Grid Storyboard & Generation Progress Tracking (`poem-image-prompts.json`)

Master 2x2 grid prompts and image generation status are tracked in **`zxt/data/blg/poem-image-prompts.json`**:

```json
[
  {
    "poem_id": 1,
    "title": "池上",
    "author": "白居易",
    "dynasty": "唐",
    "master_grid_prompt": "Traditional Chinese ink wash painting (水墨国画), Song Dynasty guohua style, soft watercolor wash, delicate ink brushwork, rice paper texture (宣纸纹理), serene atmosphere. A 2x2 storyboard grid layout featuring 4 sequential panels illustrating the poem 《池上》...",
    "master_image_input": "temp/master_grids/p1_master.png",
    "status": "pending"
  }
]
```

### 📊 Status Field States:
- **`pending`**: Image generation prompt created; master grid image not yet generated.
- **`generated`**: Master grid image (`temp/master_grids/p{id}_master.png`) saved.
- **`cropped`**: 2x2 grid cropped into WebP line assets (`p{id}_l1.webp` ... `p{id}_l4.webp`) and deployed to static assets.

---

## 3. Automated Cropping & Status Update Script: `zxt/scripts/crop_poem_grid.py`

When a 2x2 master grid image (e.g. `temp/master_grids/p1_master.png`) is ready, run:

```bash
python3 zxt/scripts/crop_poem_grid.py temp/master_grids/p1_master.png 1
```

**Actions Performed by Script:**
1. Splits master 2x2 image into 4 quadrant panels (Top-Left, Top-Right, Bottom-Left, Bottom-Right).
2. Resizes and saves panels to `zxt/web/public/assets/blg/poems/p1_l1.webp` through `p1_l4.webp`.
3. Automatically updates `"status": "cropped"` for `poem_id: 1` in `zxt/data/blg/poem-image-prompts.json`.
