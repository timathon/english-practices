# Vocab Master & Spelling Hero Shell Refactoring (2026-07-02)

This document details the refactoring performed on `VocabMasterShell.tsx` and `SpellingHeroShell.tsx` to eliminate redundant UI layouts, helper methods, audio handling, and window navigation blocking rules.

## 1. Shared Utilities and Hooks Extracted
We extracted common functional logic into new libraries inside `v2/src/lib/`:

- **Audio Playback & Caching ([practiceAudio.ts](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/practiceAudio.ts))**:
  - Defined centralized audio constants (`CORRECT_SFX_URL`, `ERROR_SFX_URL`).
  - Created a single custom hook `usePracticeAudio` to manage stateful `<audio>` refs, caching via `audioCache.cacheAudio()`, and blob URL revocation on playback end.
  - Extracted standardized British English TTS audio path resolution (`resolveAudioUrl`).

- **Navigation Blockers ([useNavigationBlocker.ts](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/useNavigationBlocker.ts))**:
  - Encapsulated React Router `useBlocker` confirmations and standard browser `beforeunload` events to prompt users before they leave active challenges.

## 2. Reusable Shell UI Components
We designed and created reusable presentation components inside `v2/src/components/shell/`:

- **[ShellHeader.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ShellHeader.tsx)**: Standard display header for dashboard return buttons, textbook grade description, and practice titles.
- **[InvisibleModeCheckbox.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/InvisibleModeCheckbox.tsx)**: Simplified invisible mode checklist control.
- **[ProgressBar.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ProgressBar.tsx)**: Segmented bar progress tracker for both redemption and normal stages.
- **[FooterAction.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/FooterAction.tsx)**: Bottom button layouts for checks, continues, and dynamic finish actions.
- **[ChallengeCardGrid.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ChallengeCardGrid.tsx)**: Displays challenge choices, lockers, remaining attempts, and runs/attempts stats cards.
- **[ShellHistoryModal.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ShellHistoryModal.tsx)**: Clean container overlay modal for runs histories.
- **[ActiveHeader.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ActiveHeader.tsx) / [ActiveHeader.css](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ActiveHeader.css)**: Consolidates the vertical column container layout (top-left Close button, bottom Timer ring) and the horizontal Progress bar (with WeChat/native platform capsule menu overlay margins on mobile).

## 3. Shell Refactoring Results
We refactored `VocabMasterShell.tsx` and `SpellingHeroShell.tsx` to consume the extracted modules. This resulted in:
- **~250+ lines of duplicate rendering code removed** from the shells.
- Replaced custom inline top-bar and navigation logic with cleaner, unit-tested shared components.
- Standardized styling via shared stylesheet properties.
