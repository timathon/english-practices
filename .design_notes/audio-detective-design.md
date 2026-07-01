# Audio Detective Design Notes

This document describes the design, implementation, and features of the **Audio Detective** (听力侦探) practice added to the smartedu english-practices platform (v2).

## 1. Practice Concept
**Audio Detective** is a listening-first practice that leverages the `passage-decoder-s.json` textbook files. Instead of presenting reading exercises in order, it shuffles the sentences of a section and plays their voice audios, challenging students to match the correct Chinese translation from multiple options.

## 2. Core Game Loop & Mechanics
- **Shuffled Gameplay**: The sentences within the active book section are randomized.
- **Audio Replay Constraints**:
  - Automatically plays the audio upon loading a question.
  - Allows the student up to **2 manual replays** (maximum of 3 plays total during gameplay).
  - Offers **1 bonus manual review play** after checking the answer (does not count towards the play limit).
- **Post-Check Auto-Play**: After clicking the "Check Answer" button, the audio automatically plays one more time to reinforce the phonetics-meaning connection, irrespective of whether the selection was correct or not.
- **English Text Reveal**: The English sentence text is hidden during the listening phase and is revealed only after the answer is checked.
- **Mistake Queue (Redemption)**:
  - An incorrect answer logs a mistake to the user's database and appends the question to the end of the redemption queue.
  - The redemption queue must be cleared (all corrected) to finish the challenge.

## 3. UI and Visual Theme
- **Theme Color**: Reuses textbook primary and dark-primary colors.
- **Gameplay Header**:
  - Close button `✕` and `CountdownRing` (10 seconds) sit relative in the top-left corner.
  - Reuses the **Vocab Master Segmented Progress Bar** showing individual boxes per question, color-coded (`green`, `yellow`, `red`, `redemption`) based on outcomes.
  - Fully responsive: progress bar narrows in mobile view (with `margin-right: 45px`) to avoid overlap with the sibling navigation panel trigger (`☰`).
- **Control Layout**:
  - The play button is kept centered in the middle of the screen.
  - The play counter sits vertically below the audio button.
  - The revealed English sentence sits under the choices container, utilizing a `min-height: 60px` layout space that is reserved even when hidden to prevent vertical shift upon reveal.
- **Completion Screen**:
  - Matches Vocab Master rewards layout card showing gained XP, Love, and Coins (1 coin awarded on completion).
  - Retains a mistaken sentences review list allowing manual plays of missed sentences.

## 4. System Integrations
- **Practice Redirection**: In [PracticeShell.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/PracticeShell.tsx), intercepted `-ad` ID extensions to load the base `passage-decoder-s` content and route to `AudioDetectiveShell`.
- **Dashboard Injection**: Synthesizes virtual "Audio Detective" practice links in [BookSection.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/BookSection.tsx) under "Text Navigators & Passage Decoders" alongside their respective passage decoders.
- **Language Translator**: Added translation mappings in [dashboardUtils.ts](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/dashboardUtils.ts) to translate `"Audio Detective"` to `"听力侦探"` and map its icon to `🎧`.
- **Mistake Reviewer**:
  - Integrated `audio-detective` into the overlay [MistakeReviewer.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/MistakeReviewer.tsx) as a multiple-choice practice.
  - Features the same listening-first behavior (auto plays audio, hides text prompt behind a play button, and reveals target text only after selection check).

## 5. Technical Highlights
- **Ref-Based Auto-Play Hook**: Built a reliable auto-play hook using a `lastPlayedQuestionId` ref to prevent state-batching delays from blocking audio playback upon visiting or re-visiting (redemption) questions.
- **Zero Shift Layouts**: Used `visibility: hidden; opacity: 0` alongside block heights (`min-height`) for revealed boxes so that card dimensions remain stable throughout gameplay transitions.
