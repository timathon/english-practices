# Process Guide: Transforming Test 1 Data (T7A)

This document records the exact steps and design decisions taken to transform the raw text and question data of **TEST 1** in [t7a-reading-yb-part-1.md](file:///home/timathon/codes/smartedu/english-practices/data/T7A/t7a-reading-yb-part-1/t7a-reading-yb-part-1.md) into interactive JSON assets: **Vocab Guide (VG)**, **Vocab Master (VM)**, **Passage Decoder (PD-W)**, and **Test Sheet**.

---

## Step 1: Data Extraction

We extracted the raw materials from the TEST 1 region:
- **5 Passages**: 4 multiple-choice reading comprehensions (Passages A, B, C, D) and 1 gap-filling reading comprehension (Passage E).
- **18 Vocabulary Items**: Extracted from the `#### **词汇短语**` sidebars.

---

## Step 2: Generating Vocab Guide (VG)
- **Target Filename**: `t7a-reading-yb-part-1-vocab-guide-test-1.json`
- **Fields Structured**:
  - `word`, `ipa`, `meaning`, `syllable_type`, `comparison`, `page_number`, `context_sentence`, and `memorization_hook`.

---

## Step 3: Generating Vocab Master (VM)
- **Target Filename**: `t7a-reading-yb-part-1-vocab-master-test-1.json`
- **Volume Rules**: Total items (18) × 3 = 54 questions. We capped and rounded down to **50 questions** (5 challenges of 10 questions each) as required by `GEMINI.md`.
- **Question Allocation**:
  - 14 words received exactly 3 questions (1 Cloze, 1 Cn2En, 1 En2Cn).
  - 4 words received 2 questions (Cn2En, En2Cn).
- **Generation Details**:
  - **Cloze**: Prompts replaced the target word with `____`. Ambiguous contexts included a `(提示: [Chinese])` hint.
  - **Distractors**: Shuffled and randomized (0-5 index). High-quality traps (e.g. `center` distracted by `central`, `circle`, `corner`, `middle`, `bottom`).
  - **IDs**: Unique 8-character alphanumeric string generated for each question.

---

## Step 4: Generating Passage Decoder (PD-W)
- **Target Filename**: `t7a-reading-yb-part-1-passage-decoder-w-test-1.json`
- **Sentence Breakdown**: Every sentence in all 5 passages was extracted verbatim.
- **Translation & Traps**:
  - Generated correct Chinese translations for each sentence.
  - Formulated 2 realistic, high-quality Chinese distractors.
- **Vocabulary Highlighting**:
  - Any sentence containing one of the 18 sidebar vocabulary words was flagged with a `highlight` field containing a comma-separated list of the vocabulary matching the exact form in the sentence.

---

## Step 5: Generating Test Sheet
- **Target Filename**: `t7a-reading-yb-part-1-test-1.json`
- **Metadata**:
  - Level: `"Grade 7 Semester 1"`
  - Title: `"第一部分 基础训练 TEST 1"`
- **Structure**:
  - **Sections `s1` to `s4`**: `reading-comprehension` type with `multiple-choice` question items.
  - **Section `s5`**: `cloze-passage-wordbank` type for the box-selection task.
  - All questions include unique 8-character IDs, translations, and detailed explanations.
