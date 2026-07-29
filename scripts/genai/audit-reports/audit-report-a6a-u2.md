# Audit Report: A6A Unit 2 Practices Data (`a6a-u2`)

**Unit Title:** Grade 6 Semester 1 Unit 2 — What's your opinion?  
**Audit Date:** 2026-07-28  
**Audited Location:** `v2-data/A6A/a6a-u2/`  
**Auditor:** Antigravity AI  

---

## 1. Executive Summary

This report evaluates all generated JSON practice files for **Grade 6 Semester 1 Unit 2** (`v2-data/A6A/a6a-u2`) against the rules established in `GEMINI.md`.

| Practice Module | Target File | Status | Key Issues / Observations |
| :--- | :--- | :---: | :--- |
| **Vocab Guide (VG)** | `a6a-u2-vocab-guide.json` |  PASSED | 20 vocabulary items accurately extracted from textbook appendix and passage context. |
| **Vocab Master (VM)** | `a6a-u2-vocab-master.json` |  PASSED | 30 questions grouped in 3 challenges of 10. `stats` object included (`vocab_guide_items: 20`, `vocab_master_questions: 30`). Redundant per-question `title` automatically stripped. |
| **Spelling Hero (SH)** | `a6a-u2-spelling-hero.json` |  PASSED | Includes all 18 single words (2 phrases filtered out correctly). Chunking and distractors match phonics/syllables rules. |
| **Sentence Architect (SA)** | `a6a-u2-sentence-architect.json` |  PASSED | 5 challenges with 10 sentences each (50 total). Noise words present and distinct. |
| **Recall Map (RM)** | `a6a-u2-recall-map.json` |  PASSED | Hierarchical mindmap with root ID `root`, `"state": "emoji"`, and emojis on every branch. |
| **Text Navigator (TN)** | `a6a-u2-text-navigator.json` |  PASSED | All 5 standard sections included (`Get Ready - Activity 1`, `Start Up`, `Speed Up`, `Fuel Up - Activity 1`, `Fuel Up - Activity 4`). Single-sentence node granularity fully enforced. |
| **Passage Decoder (PD)** | `a6a-u2-passage-decoder-s.json` |  PASSED | Sections match `Start up`, `Speed up`, `Fuel up`, `Let's explore` with 57 sentence decoding tasks. Direct speech quotes cleaned of narrative reporting verbs. |
| **Grammar Wizard (GW)** | `a6a-u2-grammar-wizard.json` |  PASSED | 20 grammar questions covering comparative adjectives and opinion structures. |

---

## 2. Detailed Audit Results by Module

### 2.1 Vocab Guide (VGE)
- **Source File:** `v2-data/A6A/a6a-u2/a6a-u2.md`
- **Extracted Count:** 20 items (13 from Appendix + 7 high-frequency unit context words).
- **Format Verification:** Valid forward-slash IPA format, exact page markers, syllable breakdown, and memory hooks.

### 2.2 Vocab Master (VM)
- **Target Calculation:** $20 \text{ non-proper items} \times 1.5 = 30 \rightarrow$ target: 30 questions.
- **Top-Level Keys:** `level`, `title`, `stats`, `challenges`.
- **Challenges:** `c1`, `c2`, `c3` (10 questions per challenge).
- **Distractor Quality:** Distractors match part-of-speech and semantic category (e.g., comparative adjectives vs comparatives, nouns vs nouns).

### 2.3 Spelling Hero (SH)
- **Filter Check:** Filtered out phrases (`fairy tale`, `plastic bag`).
- **Word Count:** 18 single words included in `spelling_words`.
- **Chunk & Distractors:** Single-syllable items (e.g. `fact` -> `f / a / ct`) and multi-syllable items (e.g. `dinosaur` -> `di / no / saur`) split with 2 plausible phonetic traps each.

### 2.4 Sentence Architect (SA)
- **Volume:** 5 Challenges (`c1`–`c5`), each containing 10 items (50 total).
- **Textbook Fidelity:** Preserved contractions (`don't`, `it's`) and British English spelling.
- **Noise Distractors:** 2-5 valid distractors per sentence, none of which overlap with words in the primary English sentence.

### 2.5 Text Navigator (TN)
- **Sections Present:**
  1. `Get Ready - Activity 1`
  2. `Start Up`
  3. `Speed Up`
  4. `Fuel Up - Activity 1`
  5. `Fuel Up - Activity 4`
- **Refinement Completed:** All multi-sentence nodes in `Speed Up` (such as Duncan's crayon letters) have been refactored into single-sentence nodes with explicit speaker properties (`Grey`, `Pink`, `Black`, `White`, `Green`).

### 2.6 Passage Decoder (PD) & Grammar Wizard (GW)
- **Passage Decoder:** Covers all major readings (4 sections, 57 sentence decoding tasks). Cleaned narrative reporting tags (e.g., `said Midas`) out of direct speech quotes in `en`.
- **Grammar Wizard:** 20 multiple-choice grammar practice items focusing on comparative forms (`-er`, `more ...`) and opinion expressions (`In my opinion...`, `I think...`).

---

## 3. Automation Guardrails & Script Refinements (`scripts/genai/`)

To prevent recurring quality issues (such as multi-sentence bundling, speaker tag pollution, and redundant fields), the generator scripts in `scripts/genai` have been directly updated with explicit rules:

1. **Text Navigator Generator ([gen_6_tn.py](file:///home/timathon/codes/smartedu/english-practices/scripts/genai/gen_6_tn.py))**:
   - Added strict instruction: `CRITICAL: Every single leaf node MUST contain EXACTLY ONE sentence (never combine 2 or more sentences into one node).`
   - Mandatory separation of speaker names into `"speaker"` attribute and removal of speaker prefixes from `text` and `cn`.

2. **Passage Decoder Generator ([gen_9_pd.py](file:///home/timathon/codes/smartedu/english-practices/scripts/genai/gen_9_pd.py))**:
   - Added strict instruction: `CRITICAL: Every element in the "sentences" array MUST contain EXACTLY ONE single sentence.`
   - Added rule: `Direct Speech Cleaning: Strip narrative reporting verbs (e.g. 'said Midas') out of direct speech quotes in "en", keeping only the clean verbatim spoken sentence, and assign the speaker name to the "speaker" field.`

3. **Vocab Master Generator ([gen_2_vm.py](file:///home/timathon/codes/smartedu/english-practices/scripts/genai/gen_2_vm.py))**:
   - Added automated post-processing filter to delete redundant `"title": "Vocab Master"` fields from individual question objects.

---

## 4. Conclusion & Next Steps

All practice files for **Grade 6 Semester 1 Unit 2** (`v2-data/A6A/a6a-u2`) pass audit guidelines cleanly, and generator scripts in `scripts/genai/` now natively enforce these standards for all future generations.
- Database seed check `npm run seed-v2` ran successfully.
