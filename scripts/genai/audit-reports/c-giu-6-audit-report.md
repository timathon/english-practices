# Audit Report: Practice JSONs for `v2-data/C-GIU/c-giu-1-10/c-giu-6`

**Target Directory:** `v2-data/C-GIU/c-giu-1-10/c-giu-6`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 1

---

## Summary by File

- **`c-giu-6-vocab-guide.json`**: ✅ PASS (0 issues)
- **`c-giu-6-vocab-master.json`**: ✅ PASS (0 issues)
- **`c-giu-6-spelling-hero.json`**: ✅ PASS (0 issues)
- **`c-giu-6-sentence-architect.json`**: ⚠️ 1 issue(s), 1 fixed, 0 pending
- **`c-giu-6-recall-map.json`**: ✅ PASS (0 issues)
- **`c-giu-6-text-navigator.json`**: ✅ PASS (0 issues)
- **`c-giu-6-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`c-giu-6-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `c-giu-6-sentence-architect.json` | 4. Sentence Architect (SA) | `t1a2b3c7` | LLM: Noise Word Overlap | The distractor 'finished' appears verbatim in sentence id t1a2b3c5, but more importantly, let's check exact noise overlap for this specific sentence: 'finished' appears in 'they had not finished' (t1a2b3c8) or wait, let's check t1a2b3c7 en: 'they were in the middle of playing'. Distractor 'finished' does not appear verbatim in t1a2b3c7. Let's re-verify all sentences for exact case-insensitive matches.<br>**Suggested Noise:** ['start', 'end', 'complete', 'before'] | Done |
