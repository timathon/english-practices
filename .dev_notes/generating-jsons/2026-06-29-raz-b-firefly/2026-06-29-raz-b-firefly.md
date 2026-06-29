# Dev Notes: Generating Exercise JSONs for RAZ-B Firefly

- **Date:** 2026-06-29
- **Target Textbook/Unit:** RAZ-B Level B - Firefly
- **Source File:** `data/RAZ-B/raz-b-f/raz-b-firefly/raz-b-firefly.md`

## 1. Process Overview
To convert the markdown data of `raz-b-firefly.md` into the interactive exercises, the JSON files were authored directly, adhering to the structure used by other RAZ Level B units (such as `clean-is-not-for-me`). The small scale of the unit allowed for precise manual alignment, matching standard IPA pronunciations, logical syllable-splitting rules, high-quality distractors, and accurate translations without automated noise.

## 2. Generated Artifacts & Implementations

### Vocab Guide (`raz-b-firefly-vocab-guide.json`)
- **Extraction:** Extracted 12 core words from the story text representing the days of the week, actions, and key vocabulary: `firefly`, `try`, `catch`, `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`, `Sunday`, `let`, `bug`.
- **Phonetics & Syllables:** Annotated with standard British IPA, visual/phonetic comparisons (e.g., `let vs net`), syllable types (`闭音节 (Closed)`, `开音节 (Open)`, and hyphenated multi-syllables like `fire-fly`), page numbers matching their occurrences, and custom Chinese memorization mnemonics.

### Vocab Master (`raz-b-firefly-vocab-master.json`)
- **Size:** Exactly 30 questions (3 challenges of 10 questions each, matching the formula `12 words * 3 = 36` rounded down to the nearest 10).
- **Format:** Consists of 10 Cloze questions, 10 Cn2En questions, and 10 En2Cn questions.
- **Distractors & Hints:** Cloze prompts include the `(提示: [Chinese meaning])` suffix. Options contain semantic matching categories (other weekdays, other insects) and spelling-critical traps (e.g., `tried vs cried/tired`).

### Spelling Hero (`raz-b-firefly-spelling-hero.json`)
- **Logic:** Single-syllable words were split by phonics graphemes (e.g., `catch` -> `c / a / tch`, `try` -> `tr / y`), and multi-syllable words by standard syllables (e.g., `Mon / day`, `Sat / ur / day`). Plausible spelling/phonetic distractors were defined for each chunk.

### Sentence Architect (`raz-b-firefly-sentence-architect.json`)
- **Volume:** Exactly 1 challenge containing 10 sentences (fitting the short scope of Level B).
- **Sentences:** Included the 7 daily attempts, the capture-and-release sentence, the lightning bugs fact, and a thematic question ("Do you like fireflies?").
- **Styling:** Configured with night-themed indigo hex codes (`primaryColor: #6366F1`) and storage suffix `_razbf_firefly`.

### Recall Map (`raz-b-firefly-recall-map.json`)
- **Tree Structure:** Nested mindmap mapping:
  - **Days of the Week**: Monday through Sunday with representative emojis.
  - **Story Plot**: daily attempts and the final catch-and-release action.
  - **Firefly Facts**: the alternative name "lightning bugs".

### Text Navigator (`raz-b-firefly-text-navigator.json`)
- **Flow:** Outlined the sequence of events over the week, keeping nesting depth within 3 levels (root -> Level 1 -> Level 2).
- **Details:** Provided verbatim text, Chinese translation, grammar notes, and a True/False statement challenge with explanations for each sentence.

### Passage Decoder (`raz-b-firefly-passage-decoder-s.json`)
- **Format:** Mapped each story sentence with paragraph breaks (`newline: true`), vocabulary highlights (e.g. `tried, catching, Monday`), and 3 natural Chinese translations avoiding lazy traps.
