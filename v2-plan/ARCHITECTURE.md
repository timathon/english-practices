# V2 Application Architecture Map

This document provides a fast-lookup architectural index for the V2 web application. Agents and developers must use this map to navigate directly to the responsible source files without spending turns doing broad filesystem searches.

---

## 1. Dashboard Architecture (`v2/src/` & `v2/src/components/dashboard/`)

### File Responsibility Index

| File Path | Role & Responsibilities | Key Functions / Exports |
| :--- | :--- | :--- |
| [`v2/src/lib/dashboardUtils.ts`](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/dashboardUtils.ts) | **Core translation & naming hub.** Maps practice types, suffixes, and textbook codes to English/Chinese display titles; handles icons and last-unit localStorage persistence. | `translatePracticeName`, `translateTextbookName`, `PRACTICE_TYPE_ICONS`, `getLastUnit`, `saveLastUnit` |
| [`v2/src/lib/textbooks.ts`](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/textbooks.ts) | **Textbook metadata.** Defines textbook codes, sort orders, display groups, and category emoji icons. | `getTextbookEmoji`, `TEXTBOOK_CATEGORIES` |
| [`v2/src/Dashboard.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/Dashboard.tsx) | **Top-level dashboard page.** Manages overall layout, practice & record fetching/caching, daily activity stats, mistake mode toggles, and test attempt review modals. | `Dashboard` component |
| [`v2/src/Dashboard.css`](file:///home/timathon/codes/smartedu/english-practices/v2/src/Dashboard.css) | **Dashboard styles.** Grid layouts, dark/light theme variables, tab scroll containers, chart containers, badges. | Styles for `.db-*` containers |
| [`v2/src/components/dashboard/BookSection.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/BookSection.tsx) | **Textbook card & practice list.** Handles unit tabs (1st & 2nd level: alphabet, NCE2 lesson groups, C-GIU units, Think 1 page groups), practice item cards, grading badges (S/A/B/C/F), completion progress bars, and practice groupings. | `BookSection` component |
| [`v2/src/components/dashboard/DashboardShared.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/DashboardShared.tsx) | **Shared UI widgets.** Animated bilingual fading names, mistake tags, Recharts 7-day activity chart, and custom chart tooltips. | `FadingPracticeName`, `FadingMistakeBadge`, `ActivityChart`, `CustomTooltip` |
| [`v2/src/components/dashboard/QuickNav.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/QuickNav.tsx) | **Sticky bottom navigation.** Floating bar for jumping directly to any textbook, unit, or top of the page. | `QuickNav` component |
| [`v2/src/components/dashboard/MistakeBookView.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/MistakeBookView.tsx) | **Mistake notebook view.** Filters by textbook/practice type, shows error counts, and launches mistake review mode. | `MistakeBookView` component |
| [`v2/src/components/dashboard/LockdownOverlay.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/LockdownOverlay.tsx) | **Testdrive modal & limit overlay.** Displays countdown and locked state when trial limits are reached. | `LockdownOverlay` component |
| [`v2/src/components/dashboard/TestdriveSelector.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/TestdriveSelector.tsx) | **Trial unit selection.** UI for testdrive accounts to switch active trial units. | `TestdriveSelector` component |
| [`v2/src/components/dashboard/ScrollDownHint.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/ScrollDownHint.tsx) | **Visual scroll prompt.** Animated chevron at the bottom of the active book section. | `ScrollDownHint` component |

---

### Direct-Edit Routing Table for Dashboard

When a user request matches one of these scenarios, edit the indicated file **immediately** without scanning caller components:

1. **Bug in Chinese or English Practice Name Translation / Suffix handling (e.g. `Passage Decoder W Xtzb` -> `课文翻译 W Xtzb`)**:
   👉 Edit `translatePracticeName` in [`v2/src/lib/dashboardUtils.ts`](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/dashboardUtils.ts).
2. **Textbook Name / Code Translation (e.g. `A6A` -> `六上`) or Emojis**:
   👉 Edit `translateTextbookName` in [`v2/src/lib/dashboardUtils.ts`](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/dashboardUtils.ts) or [`v2/src/lib/textbooks.ts`](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/textbooks.ts).
3. **Practice Grouping Order (e.g. Recall Map vs. Text Navigators vs. Writing Maps)**:
   👉 Edit `groups` definition in [`v2/src/components/dashboard/BookSection.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/BookSection.tsx).
4. **Unit Tabs, Sub-tabs (NCE2 / CGIU / Alphabet), or Progress Bars**:
   👉 Edit [`v2/src/components/dashboard/BookSection.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/BookSection.tsx).
5. **Activity Chart or Bilingual Fade Animation**:
   👉 Edit [`v2/src/components/dashboard/DashboardShared.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/DashboardShared.tsx).
6. **Mistake Notebook List / Filters**:
   👉 Edit [`v2/src/components/dashboard/MistakeBookView.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/MistakeBookView.tsx).

---

---

## 2. Mind Map Architecture (`v2/src/components/MindMapShell.tsx` & `v2/src/components/mind-map/`)

The Mind Map Shell powers hierarchical interactive mindmaps for **Text Navigator (TN)**, **Recall Map (RM)**, and **Model Writing Map (WM)**.

### File Responsibility Index

| File Path | Role & Responsibilities | Key Functions / Exports |
| :--- | :--- | :--- |
| [`v2/src/components/MindMapShell.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/MindMapShell.tsx) | **Orchestrator shell.** Manages step-by-step progressive reveal animations, audio queue & sequential Play All, mode/depth filtering, collapse state, keyboard shortcuts (`Space`, `Arrow`, `A`/`D`), and layout orientation. | `MindMapShell` component |
| [`v2/src/components/MindMapShell.css`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/MindMapShell.css) | **Mind map styles.** Tree branch connecting lines, horizontal/vertical layouts, node pills (`full`, `keywords`, `emoji`, `empty`), actions overlay, modals. | Styles for `.mm-*` containers |
| [`v2/src/components/mind-map/MindMapTypes.ts`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/MindMapTypes.ts) | **Type definitions.** `Node`, `MindMapData`, `MindMapShellProps`, and `SPEAKER_COLORS` palette. | `Node`, `MindMapData`, `MindMapShellProps`, `SPEAKER_COLORS` |
| [`v2/src/components/mind-map/mindMapUtils.ts`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/mindMapUtils.ts) | **Audio URL & tree traversal helpers.** MD5 audio hashing, tree depth calculation, node lookup, and dynamic speaker theme allocation. | `getAudioUrl`, `getMaxDepth`, `findNode`, `buildSpeakerColorMap`, `escapeRegExp` |
| [`v2/src/components/mind-map/MindMapNodeView.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/MindMapNodeView.tsx) | **Recursive node rendering.** Node states (`emoji`, `keywords`, `full`), speaker pill badges, keyword/phrase highlights, collapse indicators, and inline action overlays (🔊 Audio, CN Translation, 💡 Notes, ❓ Question). | `MindMapNodeView` component |
| [`v2/src/components/mind-map/MindMapHeader.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/MindMapHeader.tsx) | **Top header bar.** Breadcrumbs, Play All button, orientation toggle, reset button, step-by-step controls, EN/CN mode toggle, pronunciation assessment button, and top progress bar. | `MindMapHeader` component |
| [`v2/src/components/mind-map/MindMapSliders.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/MindMapSliders.tsx) | **Mode & depth sliders.** 4-level display mode slider (`Manual` / `Emoji` / `Key Words` / `Sentence`) and tree level depth filter slider (`L0` - `LN`). | `MindMapSliders` component |
| [`v2/src/components/mind-map/MindMapModals.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/MindMapModals.tsx) | **Modals.** True/False statement question modal with feedback, and sanitized Writing Task Prompt viewer modal. | `QuestionModal`, `WritingPromptModal` |
| [`v2/src/components/WritingMapShell.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/WritingMapShell.tsx) | **Writing map wrapper.** Handles model section selection (`Basic` vs. `Advanced`), model essay sanitization, and 1-page A4 landscape printable sheet with upper prompt + lower 4-column model trees. | `WritingMapShell` component, `stripModelEssaysFromPrompt` |
| [`v2/src/components/TextNavigatorShell.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/TextNavigatorShell.tsx) | **Text navigator wrapper.** Wraps single-section and multi-section text navigator data for `MindMapShell`. | `TextNavigatorShell` component |

---

### Direct-Edit Routing Table for Mind Map Shell

When a user request matches one of these scenarios, edit the indicated file **immediately**:

1. **Bug or enhancement in Audio hashing, TTS URL resolution, or Speaker Color Theme Assignment**:
   👉 Edit [`v2/src/components/mind-map/mindMapUtils.ts`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/mindMapUtils.ts).
2. **Node Pill rendering, Text Highlights, Speaker Badges, or Inline Hover Tooltips (Audio/CN/Notes/Question)**:
   👉 Edit [`v2/src/components/mind-map/MindMapNodeView.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/MindMapNodeView.tsx).
3. **Header controls, Progress Bar, Play All toggle, or Orientation Switch**:
   👉 Edit [`v2/src/components/mind-map/MindMapHeader.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/MindMapHeader.tsx).
4. **Mode Slider (`Manual`/`Emoji`/`Keywords`/`Sentence`) or Level Depth Slider (`L0`-`LN`)**:
   👉 Edit [`v2/src/components/mind-map/MindMapSliders.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/MindMapSliders.tsx).
5. **True/False Question Modal or Writing Task Prompt Modal**:
   👉 Edit [`v2/src/components/mind-map/MindMapModals.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/mind-map/MindMapModals.tsx).
6. **Progressive reveal animation steps, Play All sequential playback engine, or Keyboard Shortcuts**:
   👉 Edit [`v2/src/components/MindMapShell.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/MindMapShell.tsx).
7. **Writing Map Model Selector, Prompt Markdown Columns, or A4 Printable Sheet**:
   👉 Edit [`v2/src/components/WritingMapShell.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/WritingMapShell.tsx).

---

## 3. Architecture Expansion Roadmap

The following modules will be documented and added to this architecture map in future phases:

- [ ] **Phase 2: Test Sheet & Interactive Shells**:
  - `TestSheetShell.tsx` & `v2/src/components/test-sheet/*` (Audio player, Passage, Modals, Print layout, Question cards, Utils).
  - Individual Practice Shells (`VocabMasterShell.tsx`, `SpellingHeroShell.tsx`, `SentenceArchitectShell.tsx`, `GrammarWizardShell.tsx`, `BugHunterShell.tsx`).
- [ ] **Phase 3: Audio & Caching Layer**:
  - `v2/src/lib/audioCache.ts` (IndexedDB audio caching, R2 update synchronization via HEAD).
  - `v2/src/lib/cache.ts` (Practices and user records memory/localStorage cache).
- [ ] **Phase 4: Data Transformation & Seeding**:
  - `scripts/seed_practices.cjs` (D1 database upload, partial sync, cryptographic obscuration).
  - GenAI audit and extraction pipelines in `scripts/genai/`.

