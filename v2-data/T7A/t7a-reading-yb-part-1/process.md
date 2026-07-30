# Process Guide: Transforming Test Data (T7A)

This document records the exact steps, quality standards, and design decisions taken to transform raw text and question data from [t7a-reading-yb-part-1.md](file:///home/timathon/codes/smartedu/english-practices/v2-data/T7A/t7a-reading-yb-part-1/t7a-reading-yb-part-1.md) into interactive JSON assets: **Vocab Guide (VG)**, **Vocab Master (VM)**, **Passage Decoder (PD-W)**, and **Test Sheet**.

---

## Standard Workflow Per Test (e.g., TEST 1, TEST 2, ...)

### Step 1: Data Extraction & Verification
- Extract raw text, sidebar vocabulary (`#### **词汇短语**`), and reading comprehension questions for the specific TEST block.
- **Strict Verification Rule:** Never reuse question arrays or template content from previous tests. Every prompt, option list, answer key, translation, and explanation must be extracted and verified directly against the target TEST region in `t7a-reading-yb-part-1.md`.

---

### Step 2: Passage Text Formatting Guidelines
- **Clean Markdown Formatting:** Remove layout annotations (`[*LAYOUT:...*]`, `[*VISUAL:...*]`) and raw markdown blockquote prefixes (`> `) from the `passage` string.
- Preserved markdown elements should include standard headers (`###`), bold text (`**`), and bullet points (`*`) for clean UI rendering.

---

### Step 3: Generating Vocab Guide (VG)
- **Target Filename**: `t7a-reading-yb-part-1-vocab-guide-test-N.json`
- **Fields Structured**:
  - `word`, `ipa`, `meaning`, `syllable_type`, `comparison`, `page_number`, `context_sentence`, and `memorization_hook`.

---

### Step 4: Generating Vocab Master (VM)
- **Target Filename**: `t7a-reading-yb-part-1-vocab-master-test-N.json`
- **Volume Rules**: Total items × 2 (rounded to nearest multiple of 10, typically 30–50 questions divided into 10-question challenges).
- **Generation Details**:
  - **Cloze**: Prompts replace the target word with `____` and append a `(提示: [Chinese meaning])` hint.
  - **Distractors**: 6 shuffled, randomized options per question using plausible visual/semantic traps.
  - **IDs**: Unique 8-character alphanumeric string generated for each question.

---

### Step 5: Generating Passage Decoder (PD-W)
- **Target Filename**: `t7a-reading-yb-part-1-passage-decoder-w-test-N.json`
- **Sentence Breakdown**: Every sentence across all passages extracted verbatim.
- **Translation & Traps**: 1 accurate Chinese translation (index 0) + 2 high-quality distractors.
- **Vocabulary Highlighting**: Highlight occurrences of sidebar vocabulary using exact word forms in the sentence.

---

### Step 6: Generating Test Sheet
- **Target Filename**: `t7a-reading-yb-part-1-test-N.json`
- **Metadata**: Level (e.g. `"Grade 7 Semester 1"`), Title (e.g. `"第一部分 基础训练 TEST 2"`).
- **Section Types**:
  - **Sections `s1` to `s4`**: `reading-comprehension` type with `multiple-choice` items.
  - **Section `s5`**: Varies by test (e.g. `cloze-passage-wordbank` for fill-in-the-blank; `short-answer` for 任务型阅读简答题).
- **Quality Standard:** All items must have unique 8-character IDs, accurate translations, correct answer indices, and clear explanations.
