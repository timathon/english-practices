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

## File Directory & Assets Saved

### Art Ops & Prompts:
- `zxt/scripts/art-ops/png_to_svg.py`: Standalone PNG-to-transparent-SVG converter with example usage.
- `zxt/temp/prompts/avatar_prompts.md`: Prompts for generating all 4 clean base character models.
- `zxt/temp/prompts/avatar_blueprint.md`: Stance breakdown and eye/chin facial coordinate specs.

### Saved Assets (`zxt/temp/images/selected/` & `zxt/web/public/`):
- **Selected Clean PNGs**: `male.png`, `female.png`, `alchemist.png`, `cyber.png`
- **Transparent SVG Vectors**: `pixel_scholar_male.svg`, `pixel_scholar_female.svg`, `pixel_scholar_alchemist.svg`, `pixel_scholar_cyber.svg`

### Core Source Components (`zxt/web/src/`):
- `components/AvatarDisplay.tsx`: Modular avatar renderer supporting presets, SVG vector grids, overlay accessories, and energy aura glows.
- `components/chambers/ZhengTang.tsx`: Main Hall multi-subject scroll center.
- `components/chambers/WenGuShi.tsx`: Review chamber & Chinese sub-sections.
- `components/chambers/ZhiXinFang.tsx`: Innovation Lab & Avatar Studio.
- `components/chambers/GuanXingTai.tsx`: Sanctuary Observatory.

---

## Verification & Build Status
- **TypeScript Compilation & Vite Production Build**: Tested with `npm run build` in `zxt/web` (**Clean compile, 0 errors, build time 1.24s**).
