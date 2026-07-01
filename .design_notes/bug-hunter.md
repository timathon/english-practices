# Bug Hunter Design Notes

This document captures design decisions, UI/UX mechanics, and technical architecture rules for the **Bug Hunter** (`bug-hunter`) practice mode in V2.

## 1. Concept & Gameplay Flow
- **Visuals on Load:** The buggy sentence is loaded without highlighting the errors. All words are clickable inline elements.
- **Error Discovery:**
  - When the user taps a correct word, play a wrong SFX and show a temporary `"Try Again"` overlay block for 2 seconds.
  - When the user taps a buggy word, it is highlighted in yellow (`.buggy-selected`), and its matching **options panel** is revealed.
- **Multiple Options Panels:**
  - Each of the 2 bugs has its own `bh-options-panel`.
  - The panels are aligned side-by-side (`flex-direction: row`) splitting space equally, with buttons arranged vertically in a single column.
  - A descriptive grammar badge (`bh-error-type-tag`) is displayed above the options for grammar errors. Spelling errors do not show a label badge.
- **Unified Verification:**
  - The `"Check"` button is disabled until options for both bugs have been selected.
  - When clicked, both questions are verified simultaneously.
  - Correct selections turn green (`.correct`); incorrect ones turn red (`.wrong`).
  - Tapped words in the sentence block are replaced with the correct answers if resolved.
- **Re-queuing Wrong Answers:**
  - If either of the two bug corrections is incorrect, the question segment is marked red in the progress bar, and the sentence is appended to the end of the queue.
  - The user must solve the sentence correctly before completing the challenge.
- **Mistake Skip:**
  - Database logging (`mistakeService.addMistake`) is skipped entirely for the Bug Hunter practice shell.

## 2. Technical Mapping Rules
- **Disambiguating Duplicate Words:**
  - If a sentence contains duplicate words (e.g. multiple `"a"` articles where only one is buggy), matching by string values alone causes conflicts.
  - We support an optional `"context"` parameter in the JSON error schema.
  - If `"context"` is defined (e.g., `"on a grass"`), the matching algorithm checks the surrounding tokens in the sentence at click time to resolve the correct index.
  - Fallback matching uses order-of-occurrence indexing, ignoring elements that match context-based error rules.
