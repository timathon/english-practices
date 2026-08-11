# Audit Report: Practice JSONs for `v2-data/C-GIU/c-giu-11-20/c-giu-14`

**Target Directory:** `v2-data/C-GIU/c-giu-11-20/c-giu-14`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 4

---

## Summary by File

- **`c-giu-14-vocab-guide.json`**: ✅ PASS (0 issues)
- **`c-giu-14-vocab-master.json`**: ✅ PASS (0 issues)
- **`c-giu-14-spelling-hero.json`**: ✅ PASS (0 issues)
- **`c-giu-14-sentence-architect.json`**: ⚠️ 4 issue(s), 4 fixed, 0 pending
- **`c-giu-14-recall-map.json`**: ✅ PASS (0 issues)
- **`c-giu-14-text-navigator.json`**: ✅ PASS (0 issues)
- **`c-giu-14-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`c-giu-14-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `c-giu-14-sentence-architect.json` | 4. Sentence Architect (SA) | `s14c3s08` | LLM: Noise Word Overlap | The distractor 'never' appears verbatim in the primary English sentence 'en'.<br>**Suggested Noise:** ['rode', 'ever', 'did'] | Done |
| `c-giu-14-sentence-architect.json` | 4. Sentence Architect (SA) | `s14c3s09` | LLM: Noise Word Overlap | The distractor 'never' appears verbatim in the primary English sentence 'en'.<br>**Suggested Noise:** ['have', 'ridden', 'ever'] | Done |
| `c-giu-14-sentence-architect.json` | 4. Sentence Architect (SA) | `s14c4s02` | LLM: Noise Word Overlap | The distractor 'bought' appears verbatim in the primary English sentence 'en'.<br>**Suggested Noise:** ['have', 'buy', 'buying'] | Done |
| `c-giu-14-sentence-architect.json` | 4. Sentence Architect (SA) | `s14c5s09` | LLM: Noise Word Overlap | The distractor 'never' appears verbatim in the primary English sentence 'en'.<br>**Suggested Noise:** ['have', 'met', 'ever'] | Done |
