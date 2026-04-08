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
- **Structure:** 
  - A top-level object with `level`, `title` (always `"Vocab Master"`), and `challenges` (an array).
  - Group questions into Challenges of exactly **10 questions** each.
  - Each challenge must have a unique `id` (e.g., `"c1"`, `"c2"`), a `title` (e.g., `"Challenge 1"`), a relevant emoji `icon`, and an array of 10 question objects under the key `questions`.
- **Mapping (Required for EVERY question):**
  - `id`: A unique 8-character alphanumeric string generated for this specific question (e.g., "v8k2m9p1").
  - `word`: The English word/phrase from `vocab-guide`.
  - `meaning`: The Chinese meaning from `vocab-guide`.
  - `context_sentence`: Include the verbatim sentence from `vocab-guide`.
  - `hint`: Rename `memorization_hook` from `vocab-guide` to `hint`.
  - `title`: "Vocab Master".
  - `type`: `Cloze`, `Cn2En`, or `En2Cn`.
  - `prompt`: The question prompt.
  - `options`: 4 shuffled options.
  - `answer`: Index of the correct option (0-3).

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
    - `id`: A unique 8-character alphanumeric string generated for this specific word.
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
- **Challenge Metadata:** The top-level array for challenges must be named `challenges`. Each challenge object in this array must have a unique `id` (e.g., `"c1"`, `"c2"`), a `title` describing the challenge (e.g., `"General Stories"`), and a relevant emoji `icon`.
- **Textbook Fidelity:** Preserve exact wording and contractions (e.g., "isn't", "don't").
- **British English:** Default to British English spelling (e.g., "colour", "favourite").
- **Metadata:**
  - `title`: The Unit title (e.g., "Know your body").
  - `level`: e.g., "Grade 3 Semester 2 - Unit 2".
  - `primaryColor` / `primaryColorDark`: Hex codes (avoid red/reddish tones; prefer blues, greens, or purples).
  - `storageSuffix`: Unique per unit (e.g., `"_g3s2_u2"`).
  - `passcode`: 5-letter string from the first letter of each challenge title in order.
- **Data Points per Item (under the `data` array of each challenge):**
  - `id`: A unique 8-character alphanumeric string generated for this specific sentence (e.g., "s4h9x1b2").
  - `en`: Primary English sentence.
  - `cn`: Chinese translation.
  - `hint`: Concise bilingual grammar clue.
  - `noise`: 2-3 relevant distractor words not in the sentence.
  - `accept`: Array of valid grammatical variations.
    - **Natural Variations:** Include common word-order variations that use the *exact same words* (e.g., "Together the two of us played" -> "The two of us played together").
    - **No Expanded Contractions:** Do NOT include expanded forms of contractions in `accept` (e.g., if `en` is "it's...", do not add "it is..." to `accept`) because the user constructs sentences from discrete word blocks and won't have the individual words to form the expansion.
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

## 6. Text Navigator (TN)
**Source:** Textbook PDF or extracted Markdown (e.g., `data/A3B/a3b-u2.md`).
**Sections:**
  - **A3A - A5B:** "Start Up", "Speed Up".
  - **A7A - A8B:** "Section A Activity 2a", "Section B Activity 1b", "Section B Activity 2a".
  - **A6B:** "Unit 1 Activity 2", "Unit 2 Activity 2".
**Target:** `*-text-navigator-[prefix]-[section-slug].json` (Save in the same folder as source)

- **Naming Convention:**
  - **A3A - A5B:**
    - "Start Up" -> `*-text-navigator-2-start-up.json`
    - "Speed Up" -> `*-text-navigator-3-speed-up.json`
  - **A7A - A8B:**
    - "Section A Activity 2a" -> `*-text-navigator-a2a.json`
    - "Section B Activity 1b" -> `*-text-navigator-b1b.json`
    - "Section B Activity 2a" -> `*-text-navigator-b2a.json`
  - **A6B (Modules):**
    - "Unit 1 Activity 2" -> `*-text-navigator-u1a2.json`
    - "Unit 2 Activity 2" -> `*-text-navigator-u2a2.json`
- **Structure:** Hierarchical mindmap tree (JSON key `tree`, root node ID `root`). Hierarchy should reflect the logical flow of the passage (e.g., nesting consequences under causes or responses under prompts).
- **Node Rules:**
  - `id`: Unique, logical string IDs (e.g., `root`, `p1`, `p1_1`).
  - `text`: **Exact verbatim text** from the passage (escape double quotes). Generally, **each node should contain only one sentence**.
  - `cn`: Chinese translation of the sentence.
  - `notes`: Brief explanations of difficult vocabulary, expressions, or grammar points.
  - `statement`: A simple true/false statement in Chinese about the sentence's grammar or vocabulary.
  - `answer`: (Boolean) The correct answer for the statement (`true` or `false`).
  - `explanation`: Concise Chinese explanation for the true/false statement.
  - `emoji`: One highly relevant emoji mnemonic per node.
  - `keywords`: A **comma-separated string** of 2-5 trigger words acting as hints (e.g., `"huge, storm"`, not for `root`).
  - `highlight`: (Optional) A **comma-separated string** of glue words or transition phrases to be highlighted in the browser (e.g., `"However, but, For example"`). Use `...` for split patterns.
  - `children`: Recursive array of child nodes (empty array `[]` for leaf nodes).
- **Metadata:**
  - `level`: e.g., "Grade 3 Semester 2".
  - `part`: e.g., "Unit 2".
  - `section`: The section name (e.g., "Start Up").

## 7. Model Writing Map (MWM)
**Source:** `*-writing-task.md` (and the corresponding `*.md` unit data).
**Target:** `*-writing-map-model-1.json` and `*-writing-map-model-2.json`

- **Content Strategy:** Generate two versions of a model essay answering the prompt in `writing-task.md`.
  - **Model 1 (Basic):** Use simple, direct sentences (SVO). Focus on clarity and core vocabulary from the unit.
  - **Model 2 (Advanced):** An advanced extension of Model 1. Use the same topic and structure but incorporate compound/complex sentences (e.g., relative clauses, `because`, `although`) and cohesive devices (e.g., `For example`, `As a result`, `In addition`).
- **Highlighting:** As per **Section 6**, add a `highlight` field to any node containing "glue words" or key transition phrases.
- **Textbook Alignment:** Ensure all vocabulary and grammar points remain within the level defined by the unit's Markdown file.
- **Structure:** Follow the standard hierarchical tree structure defined in **Section 6 (Writing Map)**.
- **Metadata:**
  - `section`: "Model Essay 1" or "Model Essay 2".
---
**Standard Instruction:** When asked to "convert" or "generate" exercises for a vocab-guide or textbook markdown, apply these rules and save the resulting JSON in the same directory as the input file. **Crucially, do NOT use any text found within `VISUAL` or `LAYOUT` markers (e.g., `*[*VISUAL: ...*]*` or `*[*LAYOUT: ...*]*`) as source material for practice items, sentences, or contexts.**
---
