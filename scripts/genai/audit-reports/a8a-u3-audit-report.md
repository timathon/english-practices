# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u3`

**Target Directory:** `v2-data/A8A/a8a-u3`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 14

---

## Summary by File

- **`a8a-u3-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a8a-u3-vocab-master.json`**: ⚠️ 14 issue(s), 13 fixed, 1 pending
- **`a8a-u3-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a8a-u3-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a8a-u3-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u3-text-navigator.json`**: ✅ PASS (0 issues)
- **`a8a-u3-writing-map.json`**: ✅ PASS (0 issues)
- **`a8a-u3-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u3-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q1a2b3c4` | LLM: Low Quality Distractor | The distractor 'slow' is an antonym for 'fast' rather than a synonym or antonym fit for the target word 'shy', and the prompt lists multiple unrelated words.<br>**Suggested Options:** ['shy', 'outgoing', 'quiet', 'serious', 'friendly', 'lazy'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q4d5e6f7` | LLM: Low Quality Distractor | The prompt contains a strange mixture of unrelated words which makes the cloze context confusing for students.<br>**Suggested Options:** ['outgoing', 'shy', 'quiet', 'serious', 'friendly', 'lazy'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q10j1k2l` | LLM: Missing Hint in Ambiguous Cloze | The context sentence alone can logically accept multiple adjectives (e.g. correct, direct) without a specific Chinese prompt hint.<br>**Suggested Prompt:** `gives ____ opinions (提示: 直接的)`<br>**Suggested Options:** ['direct', 'detect', 'defect', 'effect', 'correct', 'directs'] | Pending |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q11a2b3c` | LLM: Missing Hint in Ambiguous Cloze | The context sentence can accept multiple verbs (e.g., compare, prepare, repair) without a specific Chinese prompt hint.<br>**Suggested Prompt:** `How do we ____ with each other? (提示: 比较)`<br>**Suggested Options:** ['compare', 'prepare', 'repair', 'despair', 'impair', 'compares'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q17g8h9i` | LLM: Missing Hint in Ambiguous Cloze | Multiple past-tense verbs (thought, expected, imagined, knew) can grammatically and semantically fit the blank without a specific hint.<br>**Suggested Prompt:** `Besides this, he also realized that people's lives were much harder than he ____. (提示: 预料)`<br>**Suggested Options:** ['expected', 'thought', 'imagined', 'believed', 'knew', 'guessed'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q21a2b3c` | LLM: Missing Hint in Ambiguous Cloze | Multiple musical instruments can fit 'play the Chinese ____' without a clear hint pointing specifically to the flute.<br>**Suggested Prompt:** `You play the Chinese ____ better than anyone else in our music club. (提示: 笛子)`<br>**Suggested Options:** ['flute', 'fruit', 'drum', 'violin', 'guitar', 'piano'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q27g8h9i` | LLM: Low Quality Distractor | The prompt format is unclear and lacks proper sentence context.<br>**Suggested Options:** ['Personality', 'Nationality', 'Capacity', 'Activity', 'Quality', 'Quantity'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q31a2b3c` | LLM: Low Quality Distractor | The prompt uses a data table snippet rather than a standard sentence context.<br>**Suggested Options:** ['Population', 'Popular', 'Pollution', 'Position', 'Possession', 'Potation'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q34d5e6f` | LLM: Low Quality Distractor | The prompt is formatted as raw data text rather than a grammatical sentence context.<br>**Suggested Options:** ['rainfall', 'waterfall', 'snowfall', 'downfall', 'freefall', 'pitfall'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q40j1k2l` | LLM: Missing Hint in Ambiguous Cloze | Multiple plural nouns could fit the idiom context 'difficult ____' without a specific Chinese meaning hint.<br>**Suggested Prompt:** `She helps me see the silver lining in difficult ____. (提示: 情况)`<br>**Suggested Options:** ['situations', 'stations', 'statues', 'solutions', 'salutations', 'satisfactions'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q44d5e6f` | LLM: Missing Hint in Ambiguous Cloze | Multiple types of reading materials could fit 'reads a lot of ____' without a hint.<br>**Suggested Prompt:** `I read more history books than he does, and he reads a lot of ____. (提示: 小说)`<br>**Suggested Options:** ['novels', 'levels', 'metals', 'vessels', 'hotels', 'models'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q47g8h9i` | LLM: Missing Hint in Ambiguous Cloze | The context can accept nouns like opinion, option, etc., without a specific hint.<br>**Suggested Prompt:** `He is not afraid to give his ____, especially when he thinks I am making a mistake. (提示: 意见)`<br>**Suggested Options:** ['opinion', 'onion', 'origin', 'option', 'operation', 'opposition'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q51a2b3c` | LLM: Missing Hint in Ambiguous Cloze | The sentence lacks a hint and could technically accept other nouns, though the literary reference is specific.<br>**Suggested Prompt:** `The ____, Edward, and the poor boy, Tom, are the two characters in Mark Twain's famous novel (提示: 王子)`<br>**Suggested Options:** ['prince', 'price', 'process', 'practice', 'province', 'poverty'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q96f7g8h` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'Average rainfall per year 1,923 ____ 1,475 ____' lacks a Chinese hint, but multiple units of measurement (mm, cm, m, km) could logically fit a rainfall statistic without specific context clues.<br>**Suggested Prompt:** `Average rainfall per year 1,923 ____ 1,475 ____ (提示: 毫米)` | Done |
