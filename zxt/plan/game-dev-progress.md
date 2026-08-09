# ZXT (知新堂) Game Development Progress

## Executive Summary
This document tracks the implementation progress, architectural decisions, visual design milestones, and art ops pipeline for **Phase 1: "The Peaceful Hall" (和平之堂)** in ZXT.

---

## Completed Milestones

### 1. Phase 1 Architecture: The 4 Chambers (四大堂室)
Implemented the core 4-Chamber student navigation and interaction model:
- **正堂 (Zheng Tang - Main Hall & Homework Center)**: Multi-subject homework scrolls and assigned quizzes for Chinese (识字, 拼音, 古诗, 成语), Math, and English.
- **温故室 (Wen Gu Shi - Review Chamber & Error Log)**: Review center featuring subject filter tabs, error log (错题本), and Chinese 4 sub-sections practice.
- **知新坊 (Zhi Xin Fang - Innovation Lab & Avatar Studio)**: Interactive character customization studio and Star Gems shop.
- **观星台 (Guan Xing Tai - Observatory & Sanctuary)**: Sanctuary health stats, daily streaks, and Season 1 eco-crisis crisis radar preview.

---

### 2. Avatar Studio & 16-Bit Pixel Art Asset Pipeline
- **Clean Base Character Presets**:
  - 👦 **星光少年使者 (Solar Boy)**: Spiky black hair, traditional blue Solarpunk Hanfu robes with glowing cyan circuit trims.
  - 👧 **仙灵少女使者 (Spirit Girl)**: Black twin buns with bangs, green Solarpunk Hanfu robes with cyan circuit trims & gold energy belt.
  - 🧙‍♂️ **星石炼金使者 (Star Alchemist)**: Black high ponytail & black eyes, starry purple Solarpunk Hanfu robes with magenta circuit trims.
  - 🥽 **赛博书院使者 (Cyber Scholar)**: Black scholar topknot boy, rosy blush cheeks & blue-slate anime irises, cyan/purple Solarpunk Hanfu robes.
- **Unified Facial & Stance Blueprint (`zxt/temp/prompts/avatar_blueprint.md`)**:
  - **Stance**: 3/4 perspective hero pose, torso turned 30° to right with direct eye contact.
  - **Facial Grid**: Eye level line `y=165px`, eye gap `80px`, chin level `y=245px`, 75% vertical fill.
- **Art Ops Pipeline (`zxt/scripts/art-ops/png_to_svg.py`)**:
  - Converts pixel PNGs into run-length optimized transparent SVG vector grid files.
  - Strips background alpha and white fills for transparent rendering inside custom aura halos.

---

### 3. Subject Scope & Data Principles
- Scope locked to **Chinese, Math, and English**.
- Chinese structured into 4 specialized sub-sections: **识字, 拼音, 古诗, 成语**.
- BaiLianGe (白莲阁) temporarily excluded from Phase 1 scope as instructed.

---

### 4. Accessories Overhaul & Translate Refactor (Session: 2026-08-09)

#### Accessory Alignment
- All 6 accessories (goggles, glasses, headband, badge, scroll, magic staff) repositioned to align with actual avatar body parts in the 500×500 SVG overlay coordinate space.

#### Goggles Redesign
- Removed arcing head strap and split two-lens design.
- Replaced with a **single-piece panoramic visor**: one wide amber lens, subtle center ridge, no band, no temple arms.

#### Glasses Redesign
- Replaced large circle frames with **horizontal rounded-rect lenses** (more realistic academic look).
- Added subtle blue tint fill, slim nose bridge, and glare highlights.
- Removed temple arms. Refined inter-lens gap and bridge width iteratively.

#### Translate-Based Position System
- Refactored all accessories in `AvatarDisplay.tsx` to use a single `transform="translate(X, Y)"` per `<g>`.
- All internal shape coordinates are relative to a local `(0, 0)` origin — changing only the 2 numbers in `translate()` moves the whole accessory.

#### Star Crystal Staff Repositioning
- Moved crystal gem into the face-only visible zone (`translate(335, 230)`), so the crystal and sparkles appear in the `sm` face-close-up view.
- Rod extends downward and gets naturally clipped by the circle border.

---

### 5. Face-Only Small Avatar View (Session: 2026-08-09)

- **`size="sm"` face zoom**: Added `transform: scale(2.2)` with `transformOrigin: '50% 30%'` to the avatar `<img>` for `sm` size, zooming into the face area inside the 40px nav-bar circle.
- Applied the **same transform to the accessory SVG overlay** so accessories stay correctly positioned in the zoomed view.
- All other sizes (`md`, `lg`, `xl`) unaffected.

---

### 6. Public Asset Cleanup (Session: 2026-08-09)

- Audited all files in `zxt/web/public/` against source references.
- **Deleted 16 unused PNG files** (old intermediate renders: `px_base_*`, `px_face_*`, `px_*_clean`, etc.).
- Retained only the 4 active SVG presets and `zxt_home_bg.webp`.

---

### 7. Male Avatar SVG Regeneration (Session: 2026-08-09)

- Processed `zxt/temp/images/selected/male.png`:
  - Step 1: Removed checkerboard background by targeting neutral grey pixels (R≈G≈B, range 195–225) → made transparent.
  - Step 2: Flattened onto white background.
  - Step 3: Widened replacement range (≥180) to eliminate residual anti-aliased grid lines.
- Regenerated `pixel_scholar_male.svg` via `png_to_svg.py` — white background auto-stripped to transparent, matching the format of all other preset SVGs.

---

### 8. Avatar Studio Save Flow (Session: 2026-08-09)

- **Correct initial state**: Studio now opens with the user's current saved avatar config, not `DEFAULT_AVATAR_CONFIG`. `BaiLianGe` passes `initialConfig={userAvatarConfig}` to `ZhiXinFang`.
- **Deferred sync**: Option changes stay local to the studio preview; they are **not propagated to the nav bar** until explicitly saved.
- **Save button behaviour**: Clicking 💾 保存形象设置 immediately saves and shows a **🎉 success modal** (no confirmation step). An amber pulse dot on the button indicates unsaved changes.
- **Navigation guard**: Clicking another chamber tab while the studio has unsaved changes triggers an **unsaved-changes modal** offering: Save & Leave / Discard & Leave / Continue Editing.

---

### 9. ZhengTang & WenGuShi UI Overhaul & Review Modal (Session: 2026-08-09)

- **正堂 (ZhengTang - Main Hall)**:
  - Redesigned header with dark navy/indigo gradient, glow blobs, star grid pattern, and dynamic pending/completed assignment count pills.
  - Interactive filter tab bar (`全部锦囊`, `语文`, `数学`, `英语`).
  - Improved assignment cards with clear completion state styling (`✅ 修业完毕`) and gradient CTA buttons.
  - Multi-subject quest cards styled with distinct gradient themes and glassmorphism action buttons.

- **温故室 (WenGuShi - Review Chamber & Error Logs)**:
  - Added interactive `QuizRecordModal` when clicking any history item.
  - Supports filtering questions by `📋 全部题目` or `❌ 只看错题`.
  - Question options dynamically highlight correct choices (`✓` in green) and wrong student picks (`✗` in red).
  - Integrated `CachedImage` component to ensure pictures render properly for `ImageToLine` and `ImageOrdering` review items.

---

## File Directory & Assets Saved

### Art Ops & Prompts:
- `zxt/scripts/art-ops/png_to_svg.py`: Standalone PNG-to-transparent-SVG converter with example usage.
- `zxt/temp/prompts/avatar_prompts.md`: Prompts for generating all 4 clean base character models.
- `zxt/temp/prompts/avatar_blueprint.md`: Stance breakdown and eye/chin facial coordinate specs.

### Saved Assets (`zxt/temp/images/selected/` & `zxt/web/public/`):
- **Selected Clean PNGs**: `male.png`, `female.png`, `alchemist.png`, `cyber.png`
- **Transparent SVG Vectors**: `pixel_scholar_male.svg`, `pixel_scholar_female.svg`, `pixel_scholar_alchemist.svg`, `pixel_scholar_cyber.svg`

### Core Source Components (`zxt/web/src/`):
- `components/AvatarDisplay.tsx`: Modular avatar renderer — presets, SVG vector grids, translate-based overlay accessories, face-zoom for `sm`, energy aura glows.
- `components/chambers/ZhengTang.tsx`: Main Hall multi-subject scroll center.
- `components/chambers/WenGuShi.tsx`: Review chamber & Chinese sub-sections.
- `components/chambers/ZhiXinFang.tsx`: Innovation Lab & Avatar Studio — deferred save, dirty tracking, success modal, unsaved-changes guard.
- `components/chambers/GuanXingTai.tsx`: Sanctuary Observatory.
- `pages/BaiLianGe.tsx`: Top-level student view — chamber navigation guard, avatar config state management.

---

## Verification & Build Status
- **TypeScript Compilation & Vite Production Build**: Tested with `npm run build` in `zxt/web` (**Clean compile, 0 errors, build time 1.24s**).

