# 知新堂 (Zhī Xīn Táng) & 白莲阁 (Bái Lián Gé) - Development Progress Log

> **Project Name:** 知新堂 (Zhī Xīn Táng) Multi-Subject AI Platform  
> **Flagship Module:** 白莲阁 (Bái Lián Gé) — Classical Chinese Poetry (75 Poems)  
> **Repository Path:** `zxt/`  
> **Last Updated:** 2026-07-25  

---

## 📍 Overall Status Summary

| Item | Status | Live Production Link / Detail |
| :--- | :--- | :--- |
| **Frontend Web SPA (Pages)** | 🟢 **Deployed (Phase 1 & 2 Active)** | [https://zxt-web-app.pages.dev](https://zxt-web-app.pages.dev) |
| **白莲阁 Module Route** | 🟢 **Deployed (Phase 1 & 2 Active)** | [https://zxt-web-app.pages.dev/blg](https://zxt-web-app.pages.dev/blg) |
| **Backend Worker API** | 🟢 **Deployed (Phase 1 Complete)** | [https://zxt-api.timathon-liu.workers.dev/api/health](https://zxt-api.timathon-liu.workers.dev/api/health) |
| **Custom Domain Routes** | 🟡 **Configured (Pending DNS CNAME)** | `zxt.vibequizzing.com` & `zxtapi.vibequizzing.com` |
| **Git Code Base** | 🟢 **Committed (`main`)** | Updates logged in change log below |

---

## 🚀 Completed Milestones & Accomplishments

### 1. Product Branding & Multi-Subject Positioning
- **Platform Brand:** **知新堂 (Zhī Xīn Táng)** — Rooted in 《论语·为政》 *"温故而知新，可以为师矣"*.
- **Flagship Module:** **白莲阁 (Bái Lián Gé)** — Named after 白居易《池上》 *"小娃撑小艇，偷采白莲回"* (Item #1 in `poems.md`).
- **Subject Matrix Order:**
  1. 🔴 **语文 (Chinese)** — Flagship: **白莲阁 (古诗文 75 首)** *(Live)*
  2. 🟢 **数学 (Mathematics)** — 口算速算, 空间几何, 应用题 *(Planning)*
  3. 🔵 **英语 (English)** — Vocab Master, Sentence Architect, Text Navigator *(Planning)*
  4. 🟣 **科学 (Science & STEAM)** — 虚拟实验室, 自然探索, 科技史纪 *(Planning)*

### 2. Dataset Refinement & Schema Standardization (`zxt/data/blg/`)
- **JSON Schema Standardized:** Updated `zxt/data/blg/poems-75.json` to use clean, short keys (`cn`, `en`) across all `lines` objects, removing redundant top-level translation fields.
- **5 Cognitive Exercise Types Populated:**
  - `LineAssembly` (拖拽连句)
  - `VerseCloze` (诗句填空, with explicit prompt giveaway hints removed)
  - `PinyinMatch` (读音与多音字辨析)
  - `TextToCn` (诗句现代文翻译与具混淆度选项)
  - `CulturalContext` (作者朝代与文化常识)
- **Distractor Quality Standard:** Authored high-distractor choices for `TextToCn` (Literal Polysemy Traps, Inverted Logic Traps, Passive vs Active Mismatches).

### 3. AI Chinese Painting Illustration Pipeline & Automated Cropping
- **2x2 Master Grid Storyboard Workflow:** Standardized generating 4-panel Song Dynasty ink wash painting (宋代水墨国画) storyboards per poem (`zxt/data/blg/poem-image-prompts.json`).
- **Zero-Text Policy:** Enforced strict `NO text, NO Chinese characters, NO labels, NO borders` negative prompts for clean image-to-text matching.
- **Micro-Detail Visual Fidelity:** Corrected character actions (bamboo punting pole `撑船竹竿` vs oars, plucking blooming white lotus flowers `白莲花` vs seed pods `莲蓬`, boy facing away into far distance for `浮萍一道开`).
- **Automated Cropper Utility (`zxt/scripts/crop_poem_grid.py`):**
  - Trims black grid frame lines using an aggressive 8% inset margin.
  - Crops 4 quadrant panels into true **1:1 square ratio (`400x400` px)** WebP images.
  - Automatically updates `"status": "cropped"` in `poem-image-prompts.json`.
- **Documentation Created:**
  - `zxt/data/blg/schema-guide.md` — Complete JSON schema and exercise standards guide.
  - `zxt/data/blg/image-prompt-guide.md` — AI image prompt architecture & negative constraint standards.

---

## 📅 Roadmap Phase Progress Checklist

```
[x] Phase 0: Master Specification & Development Plan HTML (zxt/plan/)
[x] Phase 1: Auth Engine & Core Cloudflare Worker / Pages Setup (Weeks 1–4)
[x] Phase 2: Complete 75-Poem Multimedia Dataset & Advanced Quiz Bank (Weeks 5–8)
[ ] Phase 3: Invisible AI Coach & SM-2 Spaced Repetition Integration (Weeks 9–12)
[ ] Phase 4: Live Classroom Smartboard Mode (WebSockets / Durable Objects) (Weeks 13–16)
[ ] Phase 5: WeChat Mini Program Cross-Compilation Export (Taro/Uni-App) (Weeks 17–20)
```

---

## 🛠️ Technical Stack Reference

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Backend:** Cloudflare Workers, Hono, TypeScript
- **Database Target:** Cloudflare D1 (SQLite)
- **Deployment Surfaces:** Cloudflare Pages (`zxt-web-app.pages.dev`), Cloudflare Workers (`zxt-api.timathon-liu.workers.dev`)

---

## 📝 Recent Change Log

| Date | Commit | Changes Summary |
| :--- | :--- | :--- |
| **2026-07-25** | *Current* | Populated 75-poem exercise dataset (`poems-75.json`) with 5 exercise types. Standardized `cn`/`en` keys and 4-option `TextToCn` distractors. Created 2x2 master storyboard image pipeline (`poem-image-prompts.json`), text-free punting pole illustration for Poem #1, and Python 1:1 square cropper script (`crop_poem_grid.py`). Added `schema-guide.md` and `image-prompt-guide.md`. |
| **2026-07-25** | `a3cf820` | Created `zxt/` workspace, master plan HTMLs, 75-poem data (`poems.md`), built & deployed Cloudflare Worker API (`zxt-api`) and Cloudflare Pages SPA (`zxt-web-app`), set up Account/Password auth & 4-view model. Reordered subject matrix (Chinese -> Math -> English -> Science). |
