# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u7`

**Target Directory:** `v2-data/A8A/a8a-u7`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 3

---

## Summary by File

- **`a8a-u7-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a8a-u7-vocab-master.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a8a-u7-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a8a-u7-sentence-architect.json`**: ⚠️ 2 issue(s), 2 fixed, 0 pending
- **`a8a-u7-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u7-text-navigator.json`**: ✅ PASS (0 issues)
- **`a8a-u7-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u7-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u7-vocab-master.json` | 2. Vocab Master (VM) | `q0040010` | Distractor PoS Mismatch | Question q0040010 (pilot [noun]): distractor 'public' has mismatching PoS [adj]. | Pending |
| `a8a-u7-sentence-architect.json` | 4. Sentence Architect (SA) | `e5f6g7h8` | LLM: Noise Word Overlap | The distractor word 'less' appears verbatim in the primary sentence 'en' ('There will be less food.').<br>**Suggested Noise:** ['much', 'many', 'few', 'was'] | Done |
| `a8a-u7-sentence-architect.json` | 4. Sentence Architect (SA) | `g3h4i5j6` | LLM: Noise Word Overlap | The distractor word 'less' appears verbatim in the primary sentence 'en' ('Well, more people will live to be over 100 years old.').<br>**Suggested Noise:** ['fewer', 'much', 'any', 'most'] | Done |
