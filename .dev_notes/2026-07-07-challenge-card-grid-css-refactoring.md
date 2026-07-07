# Challenge Card Grid & Shell Header CSS Refactoring (2026-07-07)

This document details the refactoring performed to unify the challenge card grids, headers, and individual card styles across the practice shell layouts.

## 1. Challenge Card Grid Unification
We consolidated CSS selectors from multiple separate shell stylesheets to eliminate duplication:

* **Shared Stylesheet ([ChallengeCardGrid.css](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ChallengeCardGrid.css))**:
  * Extracted structural rules (`display: grid`, `gap`, `padding`, `border`, `border-radius`, etc.) using the Vocab Master cards styling as the size and layout baseline.
  * Used standard CSS variables (`var(--primary)`, `var(--primary-dark)`) for color parameters so theme differences remain intact.
* **Component Mapping ([ChallengeCardGrid.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ChallengeCardGrid.tsx))**:
  * Standardized class names to use the unified `.shell-` prefix (e.g., `shell-challenge-grid`, `shell-challenge-card`, `shell-card-header`, `shell-card-title`, `shell-card-stats`, `shell-stat-row`, `shell-stat-label`, `shell-stat-val`, `shell-start-btn`).
  * Linked the component directly to `ChallengeCardGrid.css`.
* **Redundancy Cleanup**:
  * Refactored [PassageDecoderShell.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/PassageDecoderShell.tsx) lobby to also use the unified `ChallengeCardGrid` and standard shell components, automatically fixing its offset attempts-left text style alignment.
  * Deleted duplicate css rules from:
    * `VocabMasterShell.css`
    * `SpellingHeroShell.css`
    * `SentenceArchitectShell.css`
    * `GrammarWizardShell.css`
    * `AudioDetectiveShell.css`
    * `PassageDecoderShell.css`
  * Net savings of approximately **280 lines of duplicate CSS**.

## 2. Shell Header h1 Alignment
* Defined a single unified style override inside **[index.css](file:///home/timathon/codes/smartedu/english-practices/v2/src/index.css)**:
  ```css
  .vm-header h1,
  .sh-header h1,
  .sa-header h1,
  .gw-header h1,
  .pd-header h1,
  .det-header h1,
  .bh-header h1 {
    font-size: 1.8rem !important;
    font-weight: 800 !important;
    letter-spacing: -0.5px !important;
  }
  ```
* Enforces the premium font size and styling standard of Audio Detective across all challenge screens (for both desktop and mobile viewports).
