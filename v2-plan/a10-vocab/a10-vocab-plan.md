# A10 Vocabulary Stratification Plan & Breakdown

## 1. Overview & Source
- **Source File:** `v2-plan/a10-vocab/a10-vocab-full-list.md`
- **Total Word Items:** 2,459 words (spanning Day 1 to Day 81)
- **Word Range:** `a/an`, `ability`, `able` ... up to `zebra`, `zero`, `zipper`, `zoo`, `zone`
- **Design Principle:** Difficulty classification is based on **intrinsic English language difficulty & CEFR frequency bands** (rather than the textbook grade where words were introduced). Everyday fundamental adjectives (e.g. `lazy`, `happy`, `easy`, `cold`) belong to Level 0 foundation regardless of when a specific school textbook introduces them.

---

## 2. Level Breakdown & Target Profiles

| Level | File Name | Word Count | Percentage | Profile & Description | Representative Examples |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Level 0** | `a10-vocab-level-0.md` | 144 | 5.9% | **Starter & Core Early English (Kindergarten / Starter)**<br>Absolute basic pronouns, single digits, core greetings, basic body parts, primary colors, and basic family. | `I`, `you`, `hi`, `hello`, `cat`, `dog`, `apple`, `red`, `one`, `two` |
| **Level 1** | `a10-vocab-level-1.md` | 1,467 | 59.7% | **Elementary Foundation & Everyday English (CEFR A1)**<br>General elementary vocabulary, common daily objects, simple actions, high-frequency adjectives, and school life. | `bookstore`, `calendar`, `happy`, `lazy`, `weather`, `summer`, `clean`, `doctor` |
| **Level 2** | `a10-vocab-level-2.md` | 348 | 14.2% | **Lower Intermediate & Common English (CEFR A2)**<br>Common communicative vocabulary, regular inflections/derivatives, and routine expressions. | `absent`, `active`, `afford`, `barely`, `blank`, `bleed`, `blindly`, `cleverly`, `directly` |
| **Level 3** | `a10-vocab-level-3.md` | 164 | 6.7% | **Intermediate & Expressive English (CEFR B1)**<br>Descriptive adjectives, compound words, topic-specific everyday nouns, and intermediate transitions. | `addition`, `amusing`, `astonish`, `boundary`, `cautious`, `distract`, `graceful`, `sensible` |
| **Level 4** | `a10-vocab-level-4.md` | 336 | 13.7% | **Advanced, Academic & Specialized English (CEFR B1+/B2)**<br>Zhongkao differentiator items, academic concepts, abstract nouns, and lower-frequency vocabulary. | `applause`, `asteroid`, `astronomer`, `burial`, `characteristic`, `dilemma`, `philosophy` |
| **Total** | — | **2,459** | **100%** | **Complete coverage with zero omissions or duplicates** | — |

---

## 3. Formatting & Structural Rules
1. **Preserve Original Indexing:**
   - Every word maintains its original numeric index from `a10-vocab-full-list.md` (e.g., `* 2. **ability** ...`, `* 1145. **lazy** ...`). No re-indexing from 1.
2. **Continuous List (No Sets):**
   - Entries are organized as a continuous list under the level header without arbitrary batching or `### Set X` dividers.
3. **Definitions Preserved:**
   - Full parts of speech, British/alternative definitions, and Chinese annotations are preserved verbatim from the original compilation.

---

## 4. Verification Check
- Level 0 count: **145**
- Level 1 count: **1466**
- Level 2 count: **348**
- Level 3 count: **164**
- Level 4 count: **336**
- **Sum:** `145 + 1466 + 348 + 164 + 336 = 2,459` (matches `a10-vocab-full-list.md` line for line).

---

## 5. High-Impact Tools to Add in V2 for Fast & Firm Retention (Suggestions)

To maximize memory retention across the 2,459 words, language acquisition science (e.g. Paul Nation, Robert Bjork, Hermann Ebbinghaus) highlights active retrieval, morphological network construction, and contextual collocations. The following V2 tools are proposed:

### Tool 1: Daily Flashcard SRS (Spaced Retrieval Arena / 词汇闪卡速记)
- **Cognitive Principle:** Spaced Repetition (SRS) + Active Recall & Testing Effect.
- **Workflow & UI:**
  1. **Front:** British audio pronunciation + Syllable breakdown + Example sentence with target blanked out (`____`).
  2. **Student Action:** Quick recall flip or enter first letter / word.
  3. **Back:** Complete Chinese translation, high-frequency collocations, phonetic/visual trap comparisons (`comparison`), and mnemonic hooks (`memorization_hook`).
  4. **Self-Rating:** "Again (Red)", "Hard (Orange)", "Good (Green)".
- **Integration:** Plugs into existing V2 `records` and mistake notebooks. Words rated "Again" recirculate into the session buffer and form the next day's SRS review cohort.

### Tool 2: Collocation & Lexical Chunks Builder (搭配消消乐 / 语块连连看)
- **Cognitive Principle:** Lexical Approach (Michael Lewis) & Co-occurrence Fluency.
- **Why It Matters for A10 (Zhongkao):** Middle school exams heavily test dependent prepositions and fixed verbal phrases (e.g., *according **to***, *agree **with/on***, *take pride **in***, *look forward **to***).
- **Workflow & UI:**
  - Interactive grid / 2-column tile matching where students rapidly pair verbs with prepositions, adjectives with particles, or split idiomatic halves (*accuse + of*, *make + progress*, *be famous + for*).

### Tool 3: Word Family & Morpho-Tree Explorer (词根词缀衍生树)
- **Cognitive Principle:** Morphological Awareness & Lexical Network Theory.
- **Why It Matters for A10:** Converts isolated word memorization into exponential family learning (*act → action → active → activity → actor*; *able → ability → unable*).
- **Workflow & UI:**
  - Interactive branching tree (leveraging the MindMap shell) displaying base root/word + prefixes/suffixes + part-of-speech branches.
  - Accompanied by rapid-fire transformation drills (*"Given verb `differ`, what is the noun? → difference"*).

### Tool 4: Listening Orthography Sprint (听音速拼 / Audio Speed Spell)
- **Cognitive Principle:** Phonology-to-Orthography Dual Coding (Stanislas Dehaene).
- **Workflow & UI:**
  - Instead of passive multiple-choice recognition, the student listens to high-quality British audio, views the IPA and meaning, and types or taps syllables in correct linear order under time constraints to forge strong sound-spelling connections.

