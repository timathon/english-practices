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

## 2. Question Type Schemas (`questions` array)

All question objects share a required `id` (unique string) and `type` field.

### `LineAssembly`
Student assembles a poem line from shuffled character tiles.
> **Note:** `scrambled_chars` has been removed. The frontend derives tiles by splitting `answer` into characters and shuffling at runtime. Only `distractor_chars` needs to be supplied.

```json
{
  "id": "q_blg_001_1",
  "type": "LineAssembly",
  "line_index": 0,
  "prompt": "请将字块拼接成《池上》的第一句诗：",
  "answer": "小娃撑小艇",
  "distractor_chars": ["划", "船", "大"]
}
```

### `VerseCloze`
Fill-in-the-blank from 6 options. `answer` is the 0-based index of the correct option.

```json
{
  "id": "q_blg_001_5",
  "type": "VerseCloze",
  "prompt": "不解藏踪迹，_____一道开。",
  "options": ["浮萍", "青萍", "莲叶", "水草", "绿苔", "荷花"],
  "answer": 0,
  "explanation": "..."
}
```

### `PinyinMatch`
Select the correct pinyin + meaning from 4 options.

```json
{
  "id": "q_blg_001_8",
  "type": "PinyinMatch",
  "prompt": "...",
  "options": ["jiě (懂得，理解)", "jiè (押送)", "xiè (松懈)", "jiě (解释)"],
  "answer": 0,
  "explanation": "..."
}
```

### `TextToCn`
Match a poem line to its Chinese meaning from 4 options.

```json
{
  "id": "q_blg_001_10",
  "type": "TextToCn",
  "prompt": "诗句"不解藏踪迹"的意思是：",
  "options": ["不懂得怎样隐蔽踪迹", "..."],
  "answer": 0,
  "explanation": "..."
}
```

### `CulturalContext`
Cultural/historical multiple-choice question from 4 options.

```json
{
  "id": "q_blg_001_12",
  "type": "CulturalContext",
  "prompt": "《池上》的作者白居易属于哪个朝代？",
  "options": ["唐代", "宋代", "汉代", "清代"],
  "answer": 0,
  "explanation": "..."
}
```

### `ImageOrdering`
Student sorts shuffled poem-line images into the correct order. `answer` is the sorted array of `line_index` values.

```json
{
  "id": "q_blg_001_img_order",
  "type": "ImageOrdering",
  "prompt": "请按诗句顺序排列《池上》的插图：",
  "items": [
    { "image": "/assets/blg/poems/p1_l1.webp", "line_index": 0 },
    { "image": "/assets/blg/poems/p1_l4.webp", "line_index": 3 }
  ],
  "answer": [0, 2, 3, 1],
  "explanation": "..."
}
```

### `ImageToLine`
Match a single image to its corresponding poem line from 4 options.

```json
{
  "id": "q_blg_001_img2line_1",
  "type": "ImageToLine",
  "prompt": "观察下面的图片，选择对应的《池上》诗句：",
  "image": "/assets/blg/poems/p1_l1.webp",
  "options": ["浮萍一道开", "小娃撑小艇", "不解藏踪迹", "偷采白莲回"],
  "answer": 1,
  "explanation": "..."
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
