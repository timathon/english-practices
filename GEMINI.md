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
  - `word`: The English word or phrase.
  - `meaning`: Chinese translation, prioritizing the Chinese in the appendix vocabulary list (including parts of speech where applicable).
  - `page_number`: Extract from the `--- PRINTED PAGE X ---` markers. If a page is `Unnumbered`, infer its number based on the surrounding pages (e.g., if it precedes page 15, it is 14).
  - `context_sentence`: Find the exact sentence from the dialogue or text.
  - `ipa`: Standard British (UK) IPA for single words.
  - `comparison`: A 'word vs distractor' string for visual or phonetic comparison (e.g., 'winner vs winter', 'hill vs pill').
  - `syllable_type`: 
    - Single-syllable: 闭音节 (Closed), 开音节 (Open), 相对开音节 (VCe), 元音字母组合音节 (Vowel Team), r控制音节 (R-Controlled), 辅音+le音节 (C-le).
    - Multi-syllable: Exact syllable breakdown (e.g., `an-i-mal`).
    - **Note:** Consonant digraphs (e.g., 'th', 'sh') between a vowel and a silent 'e' still follow the **相对开音节 (VCe)** pattern (e.g., 'clothes'). Avoid misclassifying these as Vowel Teams. Ensure precise classification based on spelling rules rather than heuristic phonetic impressions.
  - `memorization_hook`: Creative mnemonics in Chinese.
- **Format:** Strict JSON following this template:
```json
{
  "level": "Grade 8 Semester 1 Unit 1",
  "source_file": "A8A-U1.md",
  "unit_vocabulary": [
    {
      "word": "ancient",
      "ipa": "/ˈeɪnʃənt/",
      "meaning": "adj. 古代的；古老的",
      "syllable_type": "an-cient",
      "comparison": "ancient vs patient",
      "page_number": "2",
      "context_sentence": "Yaming saw...",
      "memorization_hook": "联想记忆: ..."
    }
  ]
}
```


## 2. Vocab Master (VM)
**Source:** `*-vocab-guide.json`
**Target:** `*-vocab-master.json` (Save in the same folder as source)

- **Target Question Count:** `Total vocabulary items * 3`.
  - Max **50 questions**.
  - If result is < 50, round down to the nearest multiple of 10 (e.g., 14 words * 3 = 42 -> target: 40).
- **Prioritize Verbs:** Identify verbs from Chinese `meaning`. Verbs should ideally receive all 3 question types (especially `Cloze`).
- **Question Types:**
  - `Cloze`: Target word replaced by "____". 5 distractors (different forms or visually similar).
    - **Ambiguity & Hints:** The sentence context must provide sufficient information to uniquely identify the correct word among the provided options. You **must** append a Chinese hint of the target word at the end of the prompt in the format: `(提示: [Chinese meaning])` whenever the context alone could support more than one of the provided options as a correct answer (e.g., "I ____ all by myself." where any verb could fit, or "He is learning to play the ________" when multiple instruments are in the options).
  - `Cn2En`: Prompt is Chinese `meaning`. Options: Correct English + 5 distractors.
  - `En2Cn`: Prompt is English `word`. Options: Correct Chinese + 5 distractors.
- **Distractor Selection & Relevance:** Distractors must be highly relevant, logical, and plausible options. Avoid lazy, random category padding.
  - **Category/Semantic Matching**: Distractors should belong to the same semantic class or lexical category as the target word. For example, if the target is a school subject (e.g., "maths"), distractors should be other subjects (e.g., "science", "history"), NOT unrelated categories (e.g., weekdays like "Saturday"). If the target is a musical instrument (e.g., "piano"), distractors should be other instruments (e.g., "violin", "guitar", "drums").
  - **Spelling & Visual-Similarity Traps**: For spelling-critical or easily confused words, include options that share common prefixes/suffixes, look visually similar, or sound phonetically similar. For example:
    - Target `subject`: distract with `suggest`, `object`, `project`, `subway`, `subtract`.
    - Target `maths`: distract with `baths`, `mouths`, `paths`, `mats`, `match`.
    - Target `science`: distract with `silence`, `scene`, `scientist`, `since`, `service`.
- **Answer Randomization:** Correct answer index must be randomized (0-5).
- **Structure:** 
  - A top-level object with `level`, `title` (always `"Vocab Master"`), and `challenges` (an array).
  - Group questions into Challenges of exactly **10 questions** each.
  - Each challenge must have a unique `id` (e.g., `"c1"`, `"c2"`), a `title` (e.g., `"Challenge 1"`), a relevant emoji `icon`, and an array of 10 question objects under the key `questions`.
- **Mapping (Required for EVERY question):**
  - `id`: A unique 8-character alphanumeric string generated for this specific question (e.g., "v8k2m9p1").
  - `word`: The English word/phrase from `vocab-guide`.
  - `meaning`: The Chinese meaning from `vocab-guide`.
  - `context_sentence`: Include the verbatim sentence from `vocab-guide`.
  - `cn`: Include the Chinese translation of the `context_sentence` from `vocab-guide`.
  - `hint`: Rename `memorization_hook` from `vocab-guide` to `hint`.
  - `title`: "Vocab Master".
  - `type`: `Cloze`, `Cn2En`, or `En2Cn`.
  - `prompt`: The question prompt.
  - `options`: 6 shuffled options.
  - `answer`: Index of the correct option (0-5).

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
  - **Spelling & Phonetic Traps**: Distractors must be highly relevant, logical, and plausible spelling or pronunciation traps. Avoid lazy, random character substitutions.
    - *Example (surprise -> sur / prise)*: For `sur`, use distractors like `ser` and `sir`. For `prise`, use distractors like `price` and `prize`.
    - *Example (hamburger -> ham / bur / ger)*: For `bur`, use distractors like `ber` and `bir`.
    - *Example (climb -> cl / i / mb)*: For `mb`, use distractors like `m` and `me` (silent 'b' trap).
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
  - `noise`: 2-5 relevant distractor words not in the sentence. The number of noise words should scale with the sentence length (e.g., 2 for short, 5 for long). **MUST NOT** include any words already present in the primary English sentence (`en`). Distractors should be valid distractors where students may make mistakes (e.g., related in theme or part-of-speech) but must be distinct from the target words to avoid confusion or multiple correct answers with the provided blocks.
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
**Target:** `*-text-navigator.json` — a **single file per unit** containing all applicable sections. (Save in the same folder as source)

- **File Format:** All sections for a unit are consolidated into one JSON file. The top-level structure has shared `level` and `part` metadata, plus a `sections` array. Each element of `sections` is an object with a `section` string (the section name) and a `tree` object (the hierarchical mindmap for that section).
```json
{
  "level": "Grade 3 Semester 2",
  "part": "Unit 2",
  "sections": [
    {
      "section": "Start Up",
      "tree": { "id": "root", ... }
    },
    {
      "section": "Speed Up",
      "tree": { "id": "root", ... }
    }
  ]
}
```
- **Structure:** Each `tree` is a hierarchical mindmap (root node ID `root`). Hierarchy should reflect the logical flow of the passage (e.g., nesting consequences under causes or responses under prompts). Keep the hierarchy structured with a maximum nesting depth of 4 levels (i.e. `root` -> Level 1 -> Level 2 -> Level 3 -> Level 4) to ensure it is easy to navigate. Do not chain sentences infinitely into a single deep path.
- **Node Rules:**
  - `id`: Unique, logical string IDs (e.g., `root`, `p1`, `p1_1`). IDs must be unique within each `tree`.
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
- **Metadata (top-level, shared across all sections):**
  - `level`: e.g., "Grade 3 Semester 2".
  - `part`: e.g., "Unit 2".

## 7. Model Writing Map (MWM)
**Source:** `*-writing-task.md` (and the corresponding `*.md` unit data).
**Target:** `*-writing-map.json` — a **single file per unit** containing both models. (Save in the same folder as source)

- **File Format:** Both model essays for a unit are consolidated into one JSON file. The top-level structure has shared `level` and `part` metadata, plus a `sections` array. Each element of `sections` is an object with a `section` string (e.g., `"Model Essay Basic"`, `"Model Essay Advanced"`) and a `tree` object (the hierarchical mindmap for that essay).
```json
{
  "level": "Grade 7 Semester 2",
  "part": "Unit 8",
  "sections": [
    {
      "section": "Model Essay Basic",
      "tree": { "id": "root", ... }
    },
    {
      "section": "Model Essay Advanced",
      "tree": { "id": "root", ... }
    }
  ]
}
```
- **Content Strategy:** If a model essay is provided in the source material, generate the models based on it (correcting any grammatical or spelling mistakes if present). Otherwise, generate the model essays using AI to answer the prompt in `writing-task.md`.
  - **Model Basic:** Use simple, direct sentences (SVO). Focus on clarity and core vocabulary from the unit.
  - **Model Advanced:** An advanced extension of Model Basic. Use the same topic and structure but incorporate compound/complex sentences (e.g., relative clauses, `because`, `although`) and cohesive devices (e.g., `For example`, `As a result`, `In addition`).
- **Highlighting:** As per **Section 6**, add a `highlight` field to any node containing "glue words" or key transition phrases.
- **Textbook Alignment:** Ensure all vocabulary and grammar points remain within the level defined by the unit's Markdown file.
- **Structure:** Follow the standard hierarchical tree structure defined in **Section 6 (Writing Map)**.


## 8. Reading & Expression (RE)
**Source:** Reading and Expression Markdown (e.g., `data/A7B/a7b-workbooks/a7b-re-old.md`).
**Target:** `*-re-old-u[x].json` (Save in the same folder as source)

- **Conversion Scope:** Generate separate JSON files for each unit/test found in the markdown source.
- **Format & Structure:**
  - `id`: A unique string ID identifying the unit (e.g., `"a7b-re-old-u1"`).
  - `level`: The grade/semester info (e.g., `"Grade 7 Semester 2"`).
  - `unit`: The unit name (e.g., `"Unit 1"`).
  - `title`: The display title for the workbook test.
  - `passage`: Verbatim text of the reading passage.
  - `questions`: Array of exactly 4 question objects:
    - **Questions 1, 2, and 3 (细节题 / Index 0-2):**
      - `id`: Unique 8-character alphanumeric or logical string (e.g., `"u1-q41"`).
      - `number`: Question number matching the text (usually 41, 42, 43).
      - `type`: `"multiple-choice"`.
      - `prompt`: Question prompt from the markdown text.
      - `options`: Array of 4 options containing the correct answer and 3 synthetically generated plausible distractors.
      - `answer`: Index of the correct option (0-3). **Crucially, the correct answer index must be randomized (shuffled).**
    - **Question 4 (开放题 / Index 3):**
      - `id`: Unique string ID (e.g., `"u1-q44"`).
      - `number`: Question number matching the text (usually 44).
      - `type`: `"sentence-ordering"`.
      - `prompt`: Open-ended question prompt (e.g., `"What club do you want to join? Why? Write 20 words or more."`).
      - `blocks`: Array of exactly 6 sentence block objects, where exactly 3 are correct components forming a high-scoring cohesive answer and 3 are incorrect distractors.
        - Each block has `id`, `text`, `isCorrect` (boolean), and `role` (`"opinion"`, `"reason"`, `"summary"`, or `"distractor"`).
        - Correct Blocks: Include an **Opinion** (观点), a **Reason** (理由), and a **Summary/Significance** (升华) in the first person ("I", "my") that combined meet the word count requirement (e.g., ≥20 words).
        - Distractors: 3 incorrect sentence options (e.g., third-person copy-pasted sentences from the passage or unrelated grammar points).
      - `correctOrder`: Array of the 3 correct block IDs in chronological sequence (e.g., `["b1", "b2", "b3"]`).

## 9. Grammar Wizard (GW)
**Source:** Textbook contents JSON (e.g., `data/A7B/a7b-contents.json`) and the unit's Markdown file (e.g., `data/A7B/a7b-u1/a7b-u1.md`).
**Target:** `*-grammar-wizard.json` (Save in the same folder as source)

- **Target Question Count:** Exactly **2 Challenges** of **10 questions** each (20 questions total).
- **Content Focus:** Focus on the grammar points specified for the unit in the contents JSON and the usage patterns in the unit's Markdown. Questions should test:
  - **Purpose:** The communicative function or goal of the grammar rule (e.g., why do we use "Why" vs "What").
  - **Definition/Concepts:** Terminology and rules (e.g., defining countable vs. uncountable, irregular plurals).
  - **Formation:** How to construct the forms (e.g., adding -es, spelling rules for plural nouns, word order of questions).
  - **Usage:** Cloze/sentence-level questions checking application of rules in a sentence context.
  - **Differentiation:** Differentiating the unit's grammar from similar or easily confused rules (e.g., "Why" vs. "What", singular vs. plural forms, adjective vs. adverb).
- **Structure:**
  - A top-level object with `level` (e.g., `"Grade 7 Semester 2 - Unit 1"`), `title` (always `"Grammar Wizard"`), and `challenges` (an array).
  - Group questions into Challenges of exactly **10 questions** each.
  - Each challenge must have a unique `id` (e.g., `"c1"`, `"c2"`), a `title` (e.g., `"Wh-Questions & Noun Plurals"`, `"Adjectives & General Usage"`), a relevant emoji `icon` (e.g., `"🧙‍♂️"`, `"⚡"`), and an array of 10 question objects under the key `questions`.
- **Question Schema:**
  - `id`: A unique 8-character alphanumeric string generated for this specific question.
  - `type`: Always `"multiple-choice"`.
  - `category`: One of `"purpose"`, `"definition"`, `"formation"`, `"usage"`, or `"differentiation"`.
  - `prompt`: The question prompt (must be asked in Chinese, but may contain English for grammar terms). If the question involves completing a sentence, the sentence itself can be in English — but the prompt must include a Chinese label such as "完成句子：" or "选出填空最恰当的一项：" to frame it.
  - `options`: Array of exactly 4 options.
  - `answer`: Index of the correct option (0-3, randomized).
  - `explanation`: Detailed explanation in Chinese explaining the grammar rule and options.
  - `hint`: A brief, helpful cue or reminder in Chinese.

## 10. Passage Decoder (PD)
**Sources:**
- **Student's Book:** Extracted from the textbook or Student's Book passages (which are identical to those in the corresponding Text Navigator JSON). The target JSON filename must end with the `-s.json` suffix (where `-s` stands for Student's Book).
- **Passage Decoder Markdown:** Extracted from a passage decoder markdown file (e.g., `data/A5B/a5b-u1/a5b-u1-passage-decoder-w.md`), if one exists. The target JSON filename should preserve the suffix from the source markdown file (e.g., target `*-w.json` for source `*-w.md`).

**Target:** `*-passage-decoder-[suffix].json` (Save in the same folder as source)

- **Extraction Scope**: Extract every sentence/dialogue line from the passage or listening dialogue section.
- **Dialogue Formatting**: 
  - If a line is spoken by a character (e.g., `Jack: Hi, Lucy!`), extract the name as `speaker` and set `newline: true` on the first sentence of the turn.
  - Subsequent sentences spoken in the same turn share the `speaker` property but do not have `newline: true`.
  - For normal passages, set `newline: true` only on the first sentence starting a new paragraph.
- **Vocabulary Highlighting**: 
  - All passage decoders must include a `highlight` property on each sentence object (if matching vocabulary is present).
  - The `highlight` property should contain a comma-separated list of the exact matching words/phrases as they appear in the sentence, corresponding to the vocabulary listed in the unit/module/lesson's `vocab-guide.json`.
- **Options and Answer**:
  - Each sentence must have exactly 3 translation options (`options` array): 1 correct and 2 wrong distractors containing subtle traps (e.g., vocabulary swaps, tense errors, negation flips).
  - **Avoid Lazy/Obvious Traps**: Do NOT generate lazy, unnatural, or grammatically incorrect Chinese traps, such as simply prepending "不" to nouns, adjectives, names, pronouns, or adverbial phrases (e.g., "不印度尼西亚...", "不我们...", "不如果你..."), or using silly typos like "大时" instead of "小时". Distractors must be realistic, natural Chinese sentences.
  - Parenthetical explanations (e.g., `（时态错误 - ...）`) must **NOT** be included in either the `options` strings or a separate explanations field (clean translation strings only).
  - Shuffled index of the correct translation must be specified in the `answer` field (0, 1, or 2).
- **Structure**:
  - `level`: e.g., "Grade 5 Semester 2 - Unit 1".
  - `title`: e.g., "Passage Decoder".
  - `sections`: Array of section objects, each containing `title` and `sentences` (array of sentence items: `{ id, en, options, answer, speaker, newline, highlight }`).
- **Generation**: Avoid calling the Gemini API programmatically to parse or generate options. Perform translations and distractor generation directly within your own context.

## 11. Test Sheet (TS)
**Source:** Textbook PDF or Quiz markdown files (e.g., `data/A5Bx/a5bx-wm3/a5bx-wm3.md`).
**Target:** `*-test.json` (Save in the same folder as source)

- **Structure:**
  - `level`: Grade/Semester info (e.g., `"Grade 5 Semester 2 - Unit 1-3"`).
  - `title`: The display title of the test (e.g., `"Word Magician Exercise Unit 1-3"`).
  - `sections`: Array of section objects.
- **Section Fields:**
  - `id`: Unique string ID identifying the section (e.g., `"s1"`, `"s2"`).
  - `title`: Display title of the section (e.g., `"I. Read and choose"`).
  - `instruction`: Instruction text in Chinese (e.g., `"从方框中选择恰当单词填空，每词只用 1 次。"`).
  - `type`: The question type in this section:
    - `"fill-in-the-blank-wordbank"`: Fill-in-the-blank from a shared word bank.
    - `"fill-in-the-blank-firstletter"`: Fill-in-the-blank using a first-letter clue.
    - `"multiple-choice"`: Traditional multiple-choice.
  - `wordbank`: (Required for `fill-in-the-blank-wordbank` type) Array of strings representing the vocabulary choices.
  - `questions`: Array of question items.
- **Question Item Fields:**
  - `id`: A unique 8-character alphanumeric string generated for this question.
  - `prompt`: The question sentence. For blanks, use `"______"`.
  - `options`: (Required for `multiple-choice` type) Array of strings.
  - `answer`: 
    - For fill-in-the-blanks: string representing the correct answer.
    - For multiple-choice: integer index of the correct option (0-indexed).
  - `translation`: Chinese translation of the sentence.
  - `explanation`: Detailed grammatical explanation in Chinese.

- **Additional Question Type Schemas:**
  To support other question types found in textbook sources, represent them using these distinct types and JSON schemas:

  1. **`definition-matching`** (Matching definitions to a word list):
     - `type`: `"definition-matching"`
     - `wordbank`: Array of strings representing candidate words.
     - `questions`: Array of question items where:
       - `id`: 8-character alphanumeric string.
       - `prompt`: Definition sentence.
       - `answer`: Correct word string matching an item in `wordbank`.
       - `translation` & `explanation`: Chinese text.

  2. **`dialogue-completion`** (Completing dialogue with candidate sentences):
     - `type`: `"dialogue-completion"`
     - `dialogue`: Array of turn objects: `{ speaker: string, text: string }` where blanks are indicated by placeholders (e.g. `"[1]"`).
     - `options`: Array of candidate sentences.
     - `questions`: Array of question items mapping to each blank:
       - `id`: 8-character alphanumeric string.
       - `blankIndex`: 1-based index corresponding to `[1]`, `[2]`, etc.
       - `answer`: Correct option sentence (or index/character). Prefer the exact option text string.
       - `translation` & `explanation`: Chinese text.

  3. **`cloze-passage`** (Passage with inline blanks where each blank has its own independent options):
     - `type`: `"cloze-passage"`
     - `passage`: Full text string with blanks represented by `"[1]"`, `"[2]"`, etc.
     - `questions`: Array of question items mapping to each blank:
       - `id`: 8-character alphanumeric string.
       - `blankIndex`: 1-based index corresponding to the blank.
       - `options`: Array of strings containing choices specific to this blank.
       - `answer`: Integer index of correct option (0-indexed).
       - `translation` & `explanation`: Chinese text.

  4. **`true-false`** (True or False questions):
     - `type`: `"true-false"`
     - `passage`: (Optional) Text string context.
     - `questions`: Array of question items:
       - `id`: 8-character alphanumeric string.
       - `prompt`: The statement.
       - `answer`: Boolean (`true` or `false`).
       - `translation` & `explanation`: Chinese text.

  5. **`reading-comprehension`** (Reading passages with multiple-choice or short-answer questions):
     - `type`: `"reading-comprehension"`
     - `passage`: Full text string.
     - `questions`: Array of question items where:
       - `id`: 8-character alphanumeric string.
       - `type`: `"multiple-choice"` or `"short-answer"`.
       - `prompt`: Question prompt.
       - `options`: Array of strings (required for `"multiple-choice"`).
       - `answer`: Integer index of correct option (for `"multiple-choice"`) or a sample answer string (for `"short-answer"`).
       - `translation` & `explanation`: Chinese text.

  6. **`cloze-passage-wordbank`** (Passage with inline blanks filled from a shared option/word pool; each option can be used once):
     - `type`: `"cloze-passage-wordbank"`
     - `passage`: Full text string with blanks represented by `"[1]"`, `"[2]"`, etc.
     - `wordbank`: Array of strings representing candidate words or sentences.
     - `questions`: Array of question items mapping to each blank:
       - `id`: 8-character alphanumeric string.
       - `blankIndex`: 1-based index corresponding to the blank.
       - `answer`: Correct word or sentence string matching an item in `wordbank`.
       - `translation` & `explanation`: Chinese text.
     - **Instruction Mapping Rule:** Always map sections with instructions such as "阅读短文，从所给的选项中选出可以填入空白处的最佳选项，其中有一个多余的选项。" or "阅读短文，从方框内所给的选项中选出可以填入空白处的最佳选项，其中有一个多余的选项。" to this `"cloze-passage-wordbank"` type.

---
**Standard Instruction:** When asked to "convert" or "generate" exercises for a vocab-guide or textbook markdown, apply these rules and save the resulting JSON in the same directory as the input file. **Unless the user explicitly asks, do NOT generate or include the test sheet JSON (`*-test.json`) when generating exercise JSONs for a unit.**

**V2 Focus:** The project primarily runs on the V2 single-page application (served from the `v2` directory, which loads exercises dynamically from the database). Therefore, **do NOT** run `scripts/*-release-gen-3.cjs` to generate static HTML files unless the user explicitly requests HTML generation or deployment of static pages. Instead, simply generate/modify the JSON files in the `data/` directory, run the database seed/sync scripts to update the database, and test using the V2 local development server. After generating practice JSONs, you only need to run `scripts/tts-in-one.cjs` for TTS generation, excluding passage decoder.

**Crucially, do NOT use any text found within `VISUAL` or `LAYOUT` markers (e.g., `*[*VISUAL: ...*]*` or `*[*LAYOUT: ...*]*`) as source material for practice items, sentences, or contexts.**
---

## V2 Version Badge

**File:** `v2/src/App.tsx`

Whenever making a git commit that includes changes to files under the `v2/` or `api/` directories (excluding auto-generated files like `v2/public/textbooks.json`), **update the version badge** at the bottom of the `Navigation` component (`nav-menu`) before committing. The badge is a `<div>` with the format:

```
vYYMMDD-HHMM
```

Update it to the **current local date and time** at the moment of the commit (e.g., `v260521-2310`). This allows verifying whether the Cloudflare deployment is serving the latest build.

> [!NOTE]
> If only data JSON files under the `data/` directory are modified, there is no need to update the version badge, rebuild, or redeploy the client app, as the V2 application fetches all exercise content dynamically from the seeded database.


## V2 Deployment

**Platform:** Cloudflare Pages
**Project Name:** `english-practices-v2`
**Production URL:** https://epv2.vibequizzing.com

### Deploy Steps

1. Update the version badge (see above).
2. Build the app:
   > [!IMPORTANT]
   > Do NOT run `npm run build` or `npx vite build` directly in the agent's terminal:
   > - The TypeScript compile step (`tsc -b`) hangs indefinitely due to virtualized file-system auditing overhead when scanning tens of thousands of type definitions.
   > - Plain `npx <command>` hangs because dependencies are hoisted to the root of this monorepo (so `v2/` doesn't have local bin files). `npx` fails to find `vite` locally, so it attempts to query the remote registry and prompts for interactive permission, causing non-interactive terminals to lock up.
   > 
   > Instead, run the build using the **hoisted local Vite binary** directly:
   > ```bash
   > cd v2 && ../node_modules/.bin/vite build && cp public/favicon-prod.ico dist/favicon.ico
   > ```
   > 
   > Always execute the command in a clean, isolated non-persistent terminal shell (`RunPersistent: false`) to avoid session/file locking.
3. Deploy to Cloudflare Pages:
   ```bash
   npx wrangler pages deploy dist --project-name=english-practices-v2
   ```

## Data Synchronization

Whenever any JSON files in the `data/` directory are added, modified, or deleted, they must be synchronized to both the local database and the remote database. This synchronization must be performed **BEFORE** making any git commits containing the data changes. **If no JSON files under `data/` have changed since the last sync, skip these steps to avoid redundant database operations.**

### Sync Steps
1. **Sync to local database**:
   ```bash
   node scripts/seed_practices.cjs
   ```
2. **Sync to remote database**:
   ```bash
   API_URL=https://epapi.vibequizzing.com node scripts/seed_practices.cjs
   ```

> [!WARNING]
> The agent MUST NOT run the seeding script with the `--force` flag (which clears the database) unless they have received clear, explicit permission from the user.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## General Agent Rules

> [!IMPORTANT]
> **Always plan before acting.** Before carrying out any task — including file creation, data extraction, JSON generation, or code changes — present a clear, step-by-step plan to the user and wait for explicit approval. The plan must include:
> - What files will be read as sources
> - What files will be created or modified (with target paths)
> - The exact approach/method to be used (e.g., "merge via Python script", "manually write JSON", "use sed")
> - Any assumptions or decisions made
>
> Do **not** begin execution until the user confirms the plan.
