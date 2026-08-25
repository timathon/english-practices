# Audit Report: Practice JSONs for `v2-data/A7A/a7a-u7`

**Target Directory:** `v2-data/A7A/a7a-u7`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 13

---

## Summary by File

- **`a7a-u7-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a7a-u7-vocab-master.json`**: ⚠️ 7 issue(s)
- **`a7a-u7-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a7a-u7-sentence-architect.json`**: ⚠️ 2 issue(s)
- **`a7a-u7-recall-map.json`**: ✅ PASS (0 issues)
- **`a7a-u7-text-navigator.json`**: ⚠️ 4 issue(s)
- **`a7a-u7-writing-map.json`**: ✅ PASS (0 issues)
- **`a7a-u7-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a7a-u7-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `l5m6n7o8` | Distractor PoS Mismatch | Question l5m6n7o8 (blow out [phrase]): distractor 'blow' has mismatching PoS [verb]. | Question l5m6n7o8 (blow out [phrase]): distractor 'grow' has mismatching PoS [verb]. | Pending |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `p3q4r5s6` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'How ____ kilos do you want?' has multiple options ('many', 'much', 'heavy', etc.) that could grammatically fit before 'kilos' without context, though 'kilos' requires 'many'. To be pedagogically safe for primary/middle school, it should include a Chinese prompt hint.<br>**Suggested Prompt:** `How ____ kilos do you want? (提示: 多少)` | Pending |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `q7r8s9t0` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'My father marks my ____ on the door every year.' can be logically completed by other measurements like weight (if marked on a scale chart) or length, making it ambiguous without a Chinese hint.<br>**Suggested Prompt:** `My father marks my ____ on the door every year. (提示: 身高)`<br>**Suggested Options:** ['height', 'weight', 'width', 'length', 'depth', 'speed'] | Pending |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `u1v2w3x4` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'Put the things in the box into different groups on the shopping ____.' could potentially accept other words like 'list' or related concepts, but needs a hint to make the target word uniquely clear.<br>**Suggested Prompt:** `Put the things in the box into different groups on the shopping ____. (提示: 清单)`<br>**Suggested Options:** ['list', 'lost', 'last', 'least', 'listen', 'lift'] | Pending |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `s5t6u7v8` | LLM: Cn2En Type Mismatch / Low Quality Distractor | The prompt for a Cn2En type question should be in Chinese (e.g. 'n. 语言'), but it is currently in English. Additionally, the options are in Chinese which violates the Cn2En rule (Cn2En options must be English words).<br>**Suggested Options:** ['language', 'luggage', 'package', 'village', 'college', 'message'] | Pending |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `w9x0y1z2` | LLM: Cn2En Type Mismatch / Low Quality Distractor | The prompt for a Cn2En type question should be in Chinese, but it is currently in English. Furthermore, the options are in Chinese instead of English.<br>**Suggested Options:** ['international', 'national', 'natural', 'internal', 'temporal', 'optional'] | Pending |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `o1p2q3r4` | LLM: Cn2En Type Mismatch / Low Quality Distractor | The prompt for a Cn2En type question should be in Chinese, but it is currently in English. Furthermore, the options are English words for a prompt that is also in English.<br>**Suggested Options:** ['example', 'exercise', 'exam', 'experience', 'expression', 'experiment'] | Pending |
| `a7a-u7-sentence-architect.json` | 4. Sentence Architect (SA) | `ek1r754k` | LLM: Noise Word Overlap | The noise word 'question' appears verbatim (as 'questions' plural inflection variation, but wait - the instruction states inflections/plurals are NOT overlaps and are desirable grammar traps. Let's re-verify 'question' vs 'questions'. 'question' is singular, 'questions' is plural. Under rule 1: 'singular plural variations ... are HIGHLY DESIRABLE GRAMMAR TRAPS. They are NOT overlaps and MUST NOT be flagged as errors!'). Therefore, item ek1r754k has no overlap violation. | Pending |
| `a7a-u7-sentence-architect.json` | 4. Sentence Architect (SA) | `tp9x2eog` | LLM: Noise Word Overlap | The noise word 'watch' appears verbatim in the primary sentence 'en' ('to watch you grow up').<br>**Suggested Noise:** ['it', 'seeing', 'grown'] | Pending |
| `a7a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c1_sub1` | Flat Tree Structure | Node 'c1_sub1' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c1_sub2` | Flat Tree Structure | Node 'c1_sub2' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section A Activity 2a:shop_sub1` | Flat Tree Structure | Node 'shop_sub1' has 7 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section B Activity 1b:p2_sub1` | Flat Tree Structure | Node 'p2_sub1' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
