# English Practices Data Transformation Rules

This document defines the rules for extracting and converting textbook data into interactive exercise formats.

## 1. Vocab Guide Extraction (VGE)
**Source:** Textbook PDF (e.g., `temp/pdf/A3B/A3B-New-U2.pdf`) or extracted Markdown (e.g., `data/A3B/a3b-u2.md`).
**Target:** `*-vocab-guide.json`

- **Level Detection:** Determine Grade/Semester/Unit from the filename or Markdown content.
- **Extraction:** 
  - Extract **every item** from the appendix vocabulary list (found at the end of the Markdown).
  - Identify up to **10 extra** difficult words or phrases (e.g., "has got", "have got", "Good work", "What's up", "work together").
- **Data Points:**
  - `unit_vocabulary`: Array of extracted vocabulary objects.
  - `page_number`: Extract from the `--- PRINTED PAGE X ---` markers. If a page is `Unnumbered`, infer its number based on the surrounding pages (e.g., if it precedes page 15, it is 14).
  - `context_sentence`: Find the exact sentence from the dialogue or text.
  - `ipa`: Standard British (UK) IPA for single words.
  - `comparison`: A 'word vs distractor' string for visual or phonetic comparison (e.g., 'winner vs winter', 'hill vs pill').
  - `syllable_type`: 
    - Single-syllable: 闭音节 (Closed), 开音节 (Open), 相对开音节 (VCe), 元音字母组合音节 (Vowel Team), r控制音节 (R-Controlled), 辅音+le音节 (C-le).
    - Multi-syllable: Exact syllable breakdown (e.g., `an-i-mal`).
  - `memorization_hook`: Creative mnemonics in Chinese.
- **Format:** Strict JSON following the `vocab-guide` template.

## 2. Vocab Master (VM)
**Source:** `*-vocab-guide.json`
**Target:** `*-vocab-master.json` (Save in the same folder as source)

- **Target Question Count:** `Total vocabulary items * 3`.
  - Max **50 questions**.
  - If result is < 50, round down to the nearest multiple of 10 (e.g., 14 words * 3 = 42 -> target: 40).
- **Prioritize Verbs:** Identify verbs from Chinese `meaning`. Verbs should ideally receive all 3 question types (especially `Cloze`).
- **Question Types:**
  - `Cloze`: Target word replaced by "____". 3 distractors (different forms or visually similar).
  - `Cn2En`: Prompt is Chinese `meaning`. Options: Correct English + 3 distractors.
  - `En2Cn`: Prompt is English `word`. Options: Correct Chinese + 3 distractors.
- **Answer Randomization:** Correct answer index must be randomized (0-3).
- **Structure:** Group questions into Challenges of exactly **10 questions** each.
  - Each challenge must have a unique `id` and a relevant emoji `icon`.
- **Mapping:**
  - Copy `level` exactly.
  - `word`: The English word/phrase from `vocab-guide`.
  - `meaning`: The Chinese meaning from `vocab-guide`.
  - `context_sentence`: Include the verbatim sentence from `vocab-guide`.
  - Rename `memorization_hook` to `hint`.
  - `title`: "Vocab Master".

## 3. Spelling Hero (SH)
**Source:** `*-vocab-guide.json`
**Target:** `*-spelling-hero.json` (Save in the same folder as source)

- **Filter:** Only process single words. Skip any items containing spaces (phrases).
- **Word Count:** **Every** single word from the `unit_vocabulary` must be included in the `spelling_words` array.
- **Word Type:** Determine `single-syllable` or `multi-syllable` from the `syllable_type` field.
- **Chunking Logic:**
  - **Single-Syllable:** Split by phonics graphemes (e.g., "cat" -> c, a, t; "boat" -> b, oa, t).
  - **Multi-Syllable:** Split by standard syllables (e.g., "animal" -> an, i, mal).
- **Distractors:** Provide 2 phonetically or visually similar distractors for each chunk (3 options total).
- **Randomization:** Shuffle the `options` array for every chunk.
- **Structure:**
  - `level`: e.g., "Grade 7 Semester 2 - Unit 5".
  - `title`: "Spelling Master".
  - `spelling_words`: Array of word objects.
    - `word`: The English word.
    - `meaning`: Chinese translation from `vocab-guide`.
    - `type`: `single-syllable` or `multi-syllable`.
    - `chunks`: Array of chunk objects.
      - `correct`: The correct chunk string.
      - `options`: Array of 3 shuffled options.

## 4. Sentence Architect (SA)
**Source:** Textbook PDF or extracted Markdown (e.g., `data/A3B/a3b-u2.md`).
**Target:** `*-sentence-architect.json` (Save in the same folder as source)

- **Challenge Volume:** exactly **5 Challenges** per unit; **10 items** per challenge (50 sentences total).
- **Challenge Metadata:** Each challenge must have a unique `id` (e.g., `"c1"`, `"c2"`) and a relevant emoji `icon`.
- **Textbook Fidelity:** Preserve exact wording and contractions (e.g., "isn't", "don't").
- **British English:** Default to British English spelling (e.g., "colour", "favourite").
- **Metadata:**
  - `title`: The Unit title (e.g., "Know your body").
  - `level`: e.g., "Grade 3 Semester 2 - Unit 2".
  - `primaryColor` / `primaryColorDark`: Hex codes (avoid red/reddish tones; prefer blues, greens, or purples).
  - `storageSuffix`: Unique per unit (e.g., `"_g3s2_u2"`).
  - `passcode`: 5-letter string from the first letter of each challenge title in order.
- **Data Points per Item (under `data` array):**
  - `en`: Primary English sentence.
  - `cn`: Chinese translation.
  - `hint`: Concise bilingual grammar clue.
  - `noise`: 2-3 relevant distractor words not in the sentence.
  - `accept`: Array of valid grammatical variations.
- **IPA Dictionary:** Populate `ipaDict` with IPA for key/difficult words only.

## 5. Recall Map (RM)
**Source:** Textbook PDF or extracted Markdown (e.g., `data/A3B/a3b-u2.md`).
**Target:** `*-recall-map.json` (Save in the same folder as source)

- **Structure:** Hierarchical mindmap tree (JSON key `tree`, root node ID `root`).
- **Core Branches:** 
  - **Stories:** Summary of reading passages into "Memory Keys" (1-5 words).
  - **Vocabulary:** Grouped into "Verbs (Actions)", "Nouns (Things)", and "Phrases (Expressions)".
  - **Grammar Focus:** Extract patterns from "Grammar Focus" or "In Focus" sections + practice examples.
- **Node Rules:**
  - `id`: Unique, logical string IDs (e.g., `root`, `stories`, `v_v1`).
  - `text`: Bilingual for vocabulary (e.g., `jump (跳)`), English for stories/grammar.
  - `emoji`: A relevant emoji mnemonic for **EVERY** node.
- **Metadata:**
  - `level`: e.g., "Grade 3 Semester 2".
  - `part`: e.g., "Unit 2".
  - `state`: Root node MUST have `"state": "emoji"`. Other nodes default to `"state": "hidden"` (based on `a3b-u1` example).

## 6. Writing Map (WM)
**Source:** Textbook PDF or extracted Markdown (e.g., `data/A3B/a3b-u2.md`).
**Sections:** "Start Up", "Speed Up", "Section B Activity 1b", "Section B Activity 2a".
**Target:** `*-writing-map-[prefix]-[section-slug].json` (Save in the same folder as source)

- **Naming Convention (Standardized for all books):**
  - "Start Up" -> `*-writing-map-2-start-up.json`
  - "Speed Up" -> `*-writing-map-3-speed-up.json`
  - "Section B Activity 1b" -> `*-writing-map-b1b.json`
  - "Section B Activity 2a" -> `*-writing-map-b2a.json`
- **Structure:** Hierarchical mindmap tree (JSON key `tree`, root node ID `root`). Hierarchy should reflect the logical flow of the passage (e.g., nesting consequences under causes or responses under prompts).
- **Node Rules:**
  - `id`: Unique, logical string IDs (e.g., `root`, `p1`, `p1_1`).
  - `text`: **Exact verbatim text** from the passage (escape double quotes).
  - `emoji`: One highly relevant emoji mnemonic per node.
  - `keywords`: A **comma-separated string** of 2-5 trigger words acting as hints (e.g., `"huge, storm"`, not for `root`).
  - `children`: Recursive array of child nodes (empty array `[]` for leaf nodes).
- **Metadata:**
  - `level`: e.g., "Grade 3 Semester 2".
  - `part`: e.g., "Unit 2".
  - `section`: The section name (e.g., "Start Up").

---
**Standard Instruction:** When asked to "convert" or "generate" exercises for a vocab-guide or textbook markdown, apply these rules and save the resulting JSON in the same directory as the input file.
