# 知新堂 (Zhī Xīn Táng) & 白莲阁 (Bái Lián Gé) - Development Progress Log

> **Project Name:** 知新堂 (Zhī Xīn Táng) Multi-Subject AI Platform  
> **Flagship Module:** 白莲阁 (Bái Lián Gé) — Classical Chinese Poetry (75 Poems)  
> **Repository Path:** `zxt/`  
> **Last Updated:** 2026-07-25  

---

## 📍 Overall Status Summary

| Item | Status | Live Production Link / Detail |
| :--- | :--- | :--- |
| **Frontend Web SPA (Pages)** | 🟢 **Deployed (Phase 1 Complete)** | [https://zxt-web-app.pages.dev](https://zxt-web-app.pages.dev) |
| **白莲阁 Module Route** | 🟢 **Deployed (Phase 1 Complete)** | [https://zxt-web-app.pages.dev/blg](https://zxt-web-app.pages.dev/blg) |
| **Backend Worker API** | 🟢 **Deployed (Phase 1 Complete)** | [https://zxt-api.timathon-liu.workers.dev/api/health](https://zxt-api.timathon-liu.workers.dev/api/health) |
| **Custom Domain Routes** | 🟡 **Configured (Pending DNS CNAME)** | `zxt.vibequizzing.com` & `zxtapi.vibequizzing.com` |
| **Git Code Base** | 🟢 **Committed (`main`)** | Commit `a3cf820` (21 files, 3,634 insertions) |

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

### 2. User Identity & Authentication System
- **Hierarchical Provisioning Model (Zero Public Self-Reg):**
  - **System Admin:** Sets up Teacher accounts (`POST /api/admin/teachers`). Default Admin: `mmd` / `zhiyuzhishan`.
  - **Class Teacher:** Provisions Student & Parent account IDs in batch (`POST /api/teacher/students`). Default Teacher: `zhang_laoshi` / `teacher123`.
  - **Student & Parent:** Log in using teacher-provided credentials. Default Student: `yaming` / `student123`.
- **Single Account 4-View Switcher:**
  - 🎓 **Student View:** Gamified landscape map, interactive quiz runner, Mythical Scroll garden.
  - 👨‍👩‍👧 **Parent View:** Weekly AI briefings, screen-time controls, bedtime reading tips (PIN: `8848`).
  - 👩‍🏫 **Teacher View:** 30-sec assignment builder, class roster, PDF worksheet exporter.
  - ⚙️ **Admin View:** Editorial CMS, poem annotation editor, Cloudflare edge logs.

### 3. Backend Edge API (`zxt/api`)
- Built using **Cloudflare Workers**, **Hono**, and **TypeScript**.
- Configured with CORS, `nodejs_compat`, and `workers_dev`.
- **Endpoints Built & Deployed:**
  - `GET /api/health` — API health check & system version info.
  - `POST /api/auth/login` — Account/password verification returning role capabilities & JWT token.
  - `POST /api/admin/teachers` & `GET /api/admin/teachers` — Provision & list teacher accounts.
  - `POST /api/teacher/students` & `GET /api/teacher/students` — Batch provision student/parent pairs & roster.
  - `GET /api/blg/poems` — Serves 75 classic poems JSON dataset parsed from `zxt/plan/poems.md`.
  - `GET /api/ai/teacher-summary` & `GET /api/ai/parent-brief` — Executive AI summaries.

### 4. Frontend Web SPA (`zxt/web`)
- Built using **React 18**, **Vite 5**, **TypeScript**, and **Tailwind CSS CDN**.
- Deployed via **Cloudflare Pages** (`zxt-web-app.pages.dev`) with single-page-application fallback handling (`not_found_handling: "single-page-application"`).
- **Core Features Implemented:**
  - **Platform Home (`/`):** Hero section, multi-subject matrix, active view capability indicator.
  - **白莲阁 Module (`/blg`):** 
    - 75-Poem scroll list explorer with dynasty/theme filters.
    - Full verse reader with toggleable HTML5 `<ruby>` Pinyin and modern translations.
    - Interactive Scrambled Line Assembly quiz runner (拖拽/点击排词成句).
    - Mythical Scroll garden (`拾遗画卷`) unlocking lotus seals upon quiz completion.
    - Teacher PDF A4 printable worksheet generator & 30-second assignment publisher preview.

---

## 📅 Roadmap Phase Progress Checklist

```
[x] Phase 0: Master Specification & Development Plan HTML (zxt/plan/)
[x] Phase 1: Auth Engine & Core Cloudflare Worker / Pages Setup (Weeks 1–4)
[ ] Phase 2: Complete 75-Poem Multimedia & Advanced Quiz Bank (Weeks 5–8)
[ ] Phase 3: Invisible AI Coach & SM-2 Spaced Repetition Integration (Weeks 9–12)
[ ] Phase 4: Live Classroom Smartboard Mode (WebSockets / Durable Objects) (Weeks 13–16)
[ ] Phase 5: WeChat Mini Program Cross-Compilation Export (Taro/Uni-App) (Weeks 17–20)
```

---

## 🛠️ Technical Stack Reference

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Backend:** Cloudflare Workers, Hono, TypeScript
- **Database Target:** Cloudflare D1 (SQLite)
- **Deployment Surfaces:** Cloudflare Pages (`zxt-web-app.pages.dev`), Cloudflare Workers (`zxt-api.timathon-liu.workers.dev`), WeChat Mini Program (Taro/Uni-App ready target)

---

## 📝 Recent Change Log

| Date | Commit | Changes Summary |
| :--- | :--- | :--- |
| **2026-07-25** | `a3cf820` | Created `zxt/` workspace, master plan HTMLs, 75-poem data (`poems.md`), built & deployed Cloudflare Worker API (`zxt-api`) and Cloudflare Pages SPA (`zxt-web-app`), set up Account/Password auth & 4-view model. Reordered subject matrix (Chinese -> Math -> English -> Science). |
