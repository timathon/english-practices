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

## 2. Architecture Expansion Roadmap

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
