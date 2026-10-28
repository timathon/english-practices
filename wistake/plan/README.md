# Wistake (错题集市 · 错题深度悟道) — Product Roadmap & Architecture

> **Status**: **Phase 0–2 Fully Implemented & Live** (Vite + React 19 + Hono Cloudflare Worker + D1).

---

## 1. Core Vision & Concept
- **Mistake -> Wistake**: Transforming every mistake (**M**) into a permanently mastered insight & win (**W**).
- **Core Loop**:
  1. **Quick Paste / Capture**: User pastes unstructured text (stem, options, student wrong answer) or copies OCR extraction prompts for AI photo assistants.
  2. **AI Deep Diagnosis (悟道剖析)**: Gemini 3.5 Flash Lite decomposes the mistake:
     - Absolute standard answer resolution (`correct_answer`).
     - Error category: Concept / Calculation / Misread / Formula / Sign / Unit / Method.
     - Root-cause autopsy (`root_cause`).
     - Memorable anti-trap formula (`avoid_rule` / "Wistake 悟道点").
     - Key underlying mathematical concepts & rigorous solution steps (`steps`).
  3. **3-Tier Sibling Practice (3道递进变式题)**:
     - ① 镜像孪生题 (`mirror`): Exact same mathematical structure with varied numbers/contexts.
     - ② 变式拓展题 (`variant`): Slightly altered framing, reversed operations, or added steps.
     - ③ 挑战拔高题 (`stretch`): Deeper conceptual transfer or composite multi-step reasoning.
  4. **Strict Question Type Parity**:
     - Fill-in-the-blank / numeric mistakes generate **fill-in-the-blank / numeric** siblings (`type: numeric`, direct numerical input).
     - Multiple-choice mistakes generate **multiple-choice** siblings (`type: mcq`, clickable option buttons with automatic option shuffling).
  5. **Parametric Question Generator (PQG - Option B)**:
     - Safe, zero-`eval` dynamic question instantiation ([`paramGenerator.ts`](../web/src/lib/paramGenerator.ts)).
     - Supports `🎲 换组数据` (Reroll Numbers) on calculation problems: randomized variables within safe pedagogical bounds, auto-recalculating options and answer keys dynamically on the fly without consuming additional AI quota.
  6. **Review & Flipping**:
     - Single & Batch Practice modes (`批量悟道刷题`).
     - Spaced retention tracking via *days since last review* (今天 / 昨天 / 前天 / X天前 / 未复习).
     - Once proven mastered, users flip the card from **Practicing** (`M`) to **Flipped** (`W`).

---

## 2. Organization & User Hierarchy
- **Target Audience**: **Primary (Grade 1–6)** and **Junior High (Grade 7–9)** students.
- **Roles & Permissions**:
  - `student`: Access to personal mistake library, quick paste, single/batch practice, profile grade settings.
  - `admin`: Full student access + dedicated **用户管理 (Admin User Management)** console:
    - User account creation with initial passwords.
    - Password resets with one-click clipboard copying.
    - Active/deactivated status toggle.
    - Role switching (Admin ⇄ Student).
    - Customizable daily AI quota limit (`ai_daily_limit`, default 20).
    - Hard delete of users with cascading wipe of all associated mistakes and usage logs.

---

## 3. Implemented Architecture & Technology Stack
- **Frontend (`wistake/web`)**:
  - Vite 6 + React 19 + TypeScript.
  - Responsive, dark-first glassmorphic aesthetic (`#0d1321`, `#111827`, translucent borders, smooth gradients).
  - Mobile-first responsive optimization:
    - Full-viewport modal experiences on mobile (`.mobile-full-viewport-modal-inner`) with pinned headers and independent scrollable bodies.
    - Compact mobile app headers with auto-wrapping controls and streamlined quota pills.
    - Horizontal table scrolling and responsive action buttons in Admin Console.
    - React Portals (`createPortal(..., document.body)`) for top-level dialogs (Example format modal, OCR prompt modal) to prevent ancestor backdrop-filter/transform clipping.
  - Zero external UI bloat; clean custom components and Lucide icons.
- **Backend (`wistake/api`)**:
  - Cloudflare Workers + Hono.
  - Native SQLite Cloudflare **D1** database (`wistake-local-db` / remote D1).
  - Native WebCrypto PBKDF2/SHA-256 password hashing with individual salt strings.
  - Hono JWT authentication (`7d` expiry) stored in `localStorage`.
  - Rate limiting & daily AI quota enforcement via `ai_usage` table.

---

## 4. Current Endpoints & Capabilities
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate username/password → JWT token + profile |
| `GET` | `/api/auth/me` | Current user profile, role, and real-time AI quota status |
| `POST` | `/api/mistakes/parse-paste` | LLM-assisted multi-question batch text parsing |
| `POST` | `/api/mistakes/analyze` | Gemini 3.5 Flash Lite mistake diagnosis & 3-sibling generation |
| `GET` | `/api/mistakes` | Query user mistakes with filters (`chapter`, `grade`, `state`) |
| `GET` | `/api/mistakes/:id` | Full mistake detail, questions, analysis, and parametric specs |
| `POST` | `/api/mistakes/:id/flip` | Toggle mistake status between `practicing` and `flipped` |
| `POST` | `/api/mistakes/batch-delete` | Batch permanent deletion of selected mistakes |
| `POST` | `/api/attempts` | Record practice attempt and update `last_reviewed_at` |
| `GET` | `/api/admin/users` | List all users with activity, usage, and mistake counts |
| `POST` | `/api/admin/users` | Admin create new user |
| `PUT` | `/api/admin/users/:id/access` | Admin modify user status, role, grade, or AI limit |
| `PUT` | `/api/admin/users/:id/password` | Admin reset password |
| `DELETE` | `/api/admin/users/:id` | Admin delete user and all cascade data |

---

## 5. Upcoming Milestones
1. **Phase 3 — Direct Photo OCR Capture**: Direct image upload to Cloudflare R2 with Gemini 3.1 multimodal vision extraction.
2. **Phase 4 — Printable PDF Worksheet Export**: One-click generation of clean, formatted A4 homework / review worksheets with answer keys.
3. **Phase 5 — Multi-Subject Rollout**: Gradual expansion into Physics, Chemistry, and English grammar mistakes based on student grade levels.
