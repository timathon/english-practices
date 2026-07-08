# Process Guide: Transforming Test 1 Data (T8A)

This document records the exact steps and design decisions taken to transform the raw text and question data of **TEST 1** in [t8a-reading-yb-part-1.md](file:///home/timathon/codes/smartedu/english-practices/data/T8A/t8a-reading-yb-part-1/t8a-reading-yb-part-1.md) into interactive JSON assets: **Vocab Master (VM)**, **Passage Decoder (PD-W)**, and **Test Sheet (TS)**.

---

## Step 1: Data Extraction

We extracted the raw materials from the TEST 1 region (Lines 13-337 of `t8a-reading-yb-part-1.md`):
- **5 Passages**: 4 multiple-choice reading comprehensions (Passages A, B, C, D) and 1 short-answer task-based reading (Passage E).
- **17 Vocabulary Items**: Extracted from the `#### **词汇短语**` sidebars.

---

## Step 1.5: Generating Vocab Guide (VG)
- **Target Filename**: `t8a-reading-yb-part-1-vocab-guide-test-1.json`
- **Fields Structured**:
  - `word`, `ipa`, `meaning`, `syllable_type`, `comparison`, `page_number`, `context_sentence`, and `memorization_hook`.

---

## Step 2: Generating Vocab Master (VM)
- **Target Filename**: `t8a-reading-yb-part-1-vocab-master-test-1.json`
- **Volume Rules**: Total items (17) × 3 = 51 questions. We rounded down to **50 questions** (5 challenges of 10 questions each) as required by `GEMINI.md`.
- **Question Allocation**:
  - 16 words received exactly 3 questions (1 Cloze, 1 Cn2En, 1 En2Cn).
  - 1 word (`return`) received 2 questions (1 Cn2En, 1 En2Cn).
- **Generation Details**:
  - **Cloze**: Prompts replaced the target word with `____`. Ambiguous contexts included a `(提示: [Chinese])` hint.
  - **Distractors**: Highly relevant. For example:
    - `pay` was distracted by `play`, `day`, `say`, `way`, `job`, `price`.
    - `nationwide` was distracted by `national`, `native`, `nature`, `worldwide`, `international`, `local`.
  - **Randomization**: All options were randomly shuffled, and correct answers were mapping 0-5. All 50 questions were randomly distributed across the 5 challenges.
  - **IDs**: Unique 8-character alphanumeric string generated for each question.

---

## Step 3: Generating Passage Decoder (PD-W)
- **Target Filename**: `t8a-reading-yb-part-1-passage-decoder-w-test-1.json`
- **Sentence Breakdown**: Every sentence in all 5 passages was extracted verbatim.
- **Translation & Traps**:
  - Generated correct Chinese translations for each sentence.
  - Formulated 2 realistic, high-quality Chinese distractors (tense shifts, negation swaps, pronoun swaps). Simple/lazy negation traps (e.g. prepending "不" to nouns/adjectives/names) were avoided.
- **Vocabulary Highlighting**:
  - Any sentence containing one of the 17 sidebar vocabulary words was flagged with a `highlight` field containing a comma-separated list of the vocabulary matching the exact form in the sentence.

---

## Step 4: Generating Test Sheet
- **Target Filename**: `t8a-reading-yb-part-1-test-1.json`
- **Metadata**:
  - Level: `"Grade 8 Semester 1"`
  - Title: `"第一部分 基础训练 TEST 1"`
- **Structure**:
  - **Sections `s1` to `s4`**: `reading-comprehension` type with `multiple-choice` question items.
  - **Section `s5`**: `reading-comprehension` type with `short-answer` question items (Task-based reading answering questions).
  - Each question item includes unique 8-character IDs, the prompt, options (if MCQ), correct answer index/text, translation, and detailed Chinese explanation.

---

## Key Lessons for Future Tests (Tests 2, 3, etc.)
1. **Reuse Automation Scripts**: Keep the helper script templates (in `/scratch`) handy to handle shuffling, ID generation, and validation.
2. **Double check MCQ vs Short-Answer**: When parsing subsequent tests, verify if the final section is standard multiple-choice or short-answer, and configure the JSON schema accordingly.
