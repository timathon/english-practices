# Audit Report: Practice JSONs for `v2-data/A7A/a7a-u7`

**Target Directory:** `v2-data/A7A/a7a-u7`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 5

---

## Summary by File

- **`a7a-u7-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a7a-u7-vocab-master.json`**: ⚠️ 4 issue(s), 3 fixed, 1 pending
- **`a7a-u7-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a7a-u7-sentence-architect.json`**: ⚠️ 1 issue(s), 1 fixed, 0 pending
- **`a7a-u7-recall-map.json`**: ✅ PASS (0 issues)
- **`a7a-u7-text-navigator.json`**: ✅ PASS (0 issues)
- **`a7a-u7-writing-map.json`**: ✅ PASS (0 issues)
- **`a7a-u7-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a7a-u7-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `l5m6n7o8` | Distractor PoS Mismatch | Question l5m6n7o8 (blow out [phrase]): distractor 'blow' has mismatching PoS [verb]. | Question l5m6n7o8 (blow out [phrase]): distractor 'grow' has mismatching PoS [verb]. |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `v7w8x9y0z` | ID Format | Question ID 'v7w8x9y0z' is not an 8-character alphanumeric string. | Done |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `p3q4r5s6` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options (many, much, long, old, tall, heavy) could fit grammatically and semantically without a Chinese hint.<br>**Suggested Prompt:** `How ____ kilos do you want? (提示: 多少)` | Done |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `o1p2q3r4` | LLM: Low Quality Distractor | For a 'Cn2En' question type, the prompt is 'example' (English), but the prompt format should be Chinese (e.g. 'n. 例子；范例') while the options should be English words. Furthermore, some options like '考试' are Chinese instead of English target words.<br>**Suggested Options:** ['example', 'exercise', 'exam', 'experience', 'expression', 'experiment'] | Done |
| `a7a-u7-sentence-architect.json` | 4. Sentence Architect (SA) | `gwwgahd2` | LLM: Noise Word Overlap | The noise word '14' appears verbatim in the primary English sentence 'en'.<br>**Suggested Noise:** ['planting', 'fourteenth', 'at'] | Done |
