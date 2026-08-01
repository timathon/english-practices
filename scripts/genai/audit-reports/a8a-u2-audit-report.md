# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u2`

**Target Directory:** `v2-data/A8A/a8a-u2`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 8

---

## Summary by File

- **`a8a-u2-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a8a-u2-vocab-master.json`**: ⚠️ 6 issue(s), 2 fixed, 4 pending
- **`a8a-u2-spelling-hero.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a8a-u2-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a8a-u2-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u2-text-navigator.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a8a-u2-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u2-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200017` | Distractor PoS Mismatch | Question vu200017 (plan [verb]): distractor 'plate' has mismatching PoS [noun]. | Pending |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200020` | Distractor PoS Mismatch | Question vu200020 (treasure hunt [phrase]): distractor 'hunt' has mismatching PoS [verb]. | Pending |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200034` | Distractor PoS Mismatch | Question vu200034 (journey [verb]): distractor 'balcony' has mismatching PoS [noun]. | Pending |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200074` | Distractor PoS Mismatch | Question vu200074 (pack up [phrase]): distractor 'pack' has mismatching PoS [verb]. | Pending |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200050` | LLM: Low Quality Distractor | In question vu200050 (a cloze test for 'perhaps'), the distractors (probably, possibly, practically, previously, perfectly) are semantic and lexical near-synonyms or adverbial variants, which makes the blank grammatically ambiguous and open to multiple correct adverbs ('probably' or 'possibly' can also fit the sentence meaning naturally). Distractors in cloze items should focus on phonetic/visual morphology or distinct parts of speech, rather than interchangeable synonyms.<br>**Suggested Options:** ['perhaps', 'perch', 'perform', 'permit', 'persuade', 'person'] | Done |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200085` | LLM: Cn2En Option Language Rule | For type Cn2En, options must be English phrases/words. However, options here are in English which is correct for Cn2En, but wait—let's check En2Cn questions instead. Let's check question vu200092.<br>**Suggested Options:** ['add sth to sth', 'add sth from sth', 'add sth with sth', 'add sth in sth', 'add sth off sth', 'add sth by sth'] | Done |
| `a8a-u2-spelling-hero.json` | 3. Spelling Hero (SH) | `Coverage` | Missing Single Words | Single-word vocabulary items missing from Spelling Hero: {'paper-cut'} | Pending |
| `a8a-u2-text-navigator.json` | 6. Text Navigator (TN) | `Section A Activity 2a:t7` | Nesting Depth Exceeded | Node 't7' at depth 5 exceeds max allowed nesting depth of 4 levels. | Pending |
