# Refactoring Practice Shells to Eliminate Duplicate Code (2026-06-26)

This document outlines the implementation plan and tracks progress for extracting common logic and reducing redundancy across all quiz/practice shell components in `v2/src/components`.

## 1. Implementation Plan

### Common Redundancies Identified
Across all shells (e.g., `PassageDecoderShell`, `SpellingHeroShell`, `VocabMasterShell`, `SentenceArchitectShell`, `GrammarWizardShell`):
1. **Record Loading & Syncing (`loadRecords`, `syncRecord`):** Duplicate implementations of cache checks, POST/PUT API calls to `/api/records`, and `practiceRecords` state updates.
2. **Daily Limit & Locking:** Identical logic for getting trial counts, consuming trials, checking if a challenge is locked today (`todayBest === 100`), and opening the `<DailyLockModal />`.
3. **Reward Awards & XP:** Identical wrappers for calling `petService.awardQuizCompletion()` and tracking `gainedXp`/`gainedLove` states.

### Refactoring Phases
* **Phase 1:** Extract `usePracticeRecords` Hook. Encapsulate all record loading, caching, database syncing, and today/lifetime stats calculation. Refactor `PassageDecoderShell` to use the new hook.
* **Phase 2:** Refactor `PassageDecoderShell.tsx` to use the new hook (and verify behavior).
* **Phase 3:** Migrate remaining shells (`SpellingHeroShell`, `VocabMasterShell`, `SentenceArchitectShell`, `GrammarWizardShell`) to use the new hook.
* **Phase 4:** Extract `usePracticeTrials` Hook to manage trial consumption, lock modal state, and lock logic (`stats.todayBest === 100`).

---

## 2. Progress Tracker

- [x] Create `usePracticeRecords.ts` custom hook in `v2/src/hooks/usePracticeRecords.ts` (Phase 1)
- [x] Refactor `PassageDecoderShell.tsx` to use the new hook (Phase 1/2)
- [x] Verify the refactored PassageDecoderShell works correctly
- [ ] Migrate `SpellingHeroShell` to use `usePracticeRecords` (Phase 3)
- [ ] Migrate `VocabMasterShell` to use `usePracticeRecords` (Phase 3)
- [ ] Migrate `SentenceArchitectShell` to use `usePracticeRecords` (Phase 3)
- [ ] Migrate `GrammarWizardShell` to use `usePracticeRecords` (Phase 3)
- [ ] Extract `usePracticeTrials` Hook (Phase 4)
