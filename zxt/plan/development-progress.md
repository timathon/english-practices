# 知新堂 (Zhī Xīn Táng) & 白莲阁 (Bái Lián Gé) - Development Progress Log

> **Project Name:** 知新堂 (Zhī Xīn Táng) Multi-Subject AI Platform  
> **Flagship Module:** 白莲阁 (Bái Lián Gé) — Classical Chinese Poetry (75 Poems)  
> **Repository Path:** `zxt/`  
> **Last Updated:** 2026-07-27  

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
  - `LineAssembly` (拖拽连句, tiles derived dynamically from `answer`, stripped legacy `scrambled_chars`)
  - `ImageOrdering` (插图故事情节排序, simplified to `images` list matching poem sequential order)
  - `VerseCloze` (诗句填空, 4-option sampling with correct option guaranteed)
  - `PinyinMatch` (读音与多音字辨析)
  - `TextToCn` (诗句现代文翻译与具混淆度选项)
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
| **2026-07-27** | *Current* | **Teacher Portal & Question Bank Editor Overhaul:**<br/>• Integrated `当前班级:` dropdown into Teacher header card with live student count (`(N人)`), filtered to assigned classes for teachers.<br/>• Streamlined Teacher sub-navigation tabs to `📌 作业发布`, `📊 作业统计`, `🧭 课程进度`.<br/>• Added Subject (`语文`, `数学`, `英语`, `科学`) and Section (`白莲阁`, etc.) cascading dropdowns to Publish Assignment form.<br/>• Conditionally rendered `选择古诗` (active on 语文-白莲阁), filtering to unlocked/finished teaching poems (`learntPoemIds`) and displaying published assignment counts (`(已发布 N 次)`).<br/>• Dynamically updated assignment requirement description (`作业要求说明`) based on subject/section selection.<br/>• Question Editor: Added responsive mobile layout with poem selector dropdown & tab switcher, preview lightbox modal, interactive student quiz runner modal (`👁 预览全套`, `👁 预览当前题目`), post-submission locks, and red/green visual feedback.<br/>• Header View Selector: Teachers with editor role (e.g. `zhang_laoshi`) default to Teacher Dashboard (`/teacher`) and can toggle between `👩‍🏫 教师工作台` and `✍️ 平台题库编辑`. Updated Editor Header card to `全学科题库管理` with subject/section selectors and placeholder view for other subjects.<br/>• Chinese Question Type Badges: Clean Chinese-only exercise labels (`连句组装`, `诗句填空`, `拼音辨析`, `诗意理解`, `文化背景`, `插图排序`, `图配句`).<br/>• Compressed Local Audio SFX: Ultra-compressed `correct.mp3` (7.6KB) and `error.mp3` (9.1KB) with Web Audio API synth fallback.<br/>• Assignment Question Review & Selection Modal: Added `📌 作业题目审核与精选` modal before publishing homework, allowing teachers to review and uncheck specific questions (`已勾选 N / M 题`). |
| **2026-07-26** | *Prior* | Fine-tuned Platform Admin & Teacher account management UI. Added Teacher edit modal reuse with username/password reset workflow & custom confirmation alert. Cleaned up English translations from brand badges and header taglines. Fixed mobile viewport non-scalable meta tag (`user-scalable=no`). Fixed sticky header subpixel leak & backdrop overlay layout (`w-screen h-screen m-0 z-[100] fixed top-0 left-0 right-0 bottom-0`). |
| **2026-07-26** | *Prior* | Elevated Admin Management (Class setup, Teacher & Student account allocation) and Question Bank Editing to Platform Level (`PlatformAdminPanel.tsx` / `PlatformQuestionEditor.tsx`). Positioned 白莲阁 (xzt-blg) as a sub-module section under the Chinese subject. Completed Student 3-part view (Assignments, History, Self-study) and Teacher classroom view (Class selection, Publishing, Stats, Progress unlock). |
| **2026-07-25** | *Prior* | Populated 75-poem exercise dataset (`poems-75.json`) with 5 exercise types. Standardized `cn`/`en` keys and 4-option `TextToCn` distractors. Created 2x2 master storyboard image pipeline (`poem-image-prompts.json`), text-free punting pole illustration for Poem #1, and Python 1:1 square cropper script (`crop_poem_grid.py`). Added `schema-guide.md` and `image-prompt-guide.md`. |
| **2026-07-25** | `a3cf820` | Created `zxt/` workspace, master plan HTMLs, 75-poem data (`poems.md`), built & deployed Cloudflare Worker API (`zxt-api`) and Cloudflare Pages SPA (`zxt-web-app`), set up Account/Password auth & 4-view model. Reordered subject matrix (Chinese -> Math -> English -> Science). |
