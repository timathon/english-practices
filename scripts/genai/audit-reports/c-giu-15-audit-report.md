# Audit Report: Practice JSONs for `v2-data/C-GIU/c-giu-11-20/c-giu-15`

**Target Directory:** `v2-data/C-GIU/c-giu-11-20/c-giu-15`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 3

---

## Summary by File

- **`c-giu-15-vocab-guide.json`**: ✅ PASS (0 issues)
- **`c-giu-15-vocab-master.json`**: ✅ PASS (0 issues)
- **`c-giu-15-spelling-hero.json`**: ✅ PASS (0 issues)
- **`c-giu-15-sentence-architect.json`**: ⚠️ 3 issue(s), 2 fixed, 1 pending
- **`c-giu-15-recall-map.json`**: ✅ PASS (0 issues)
- **`c-giu-15-text-navigator.json`**: ✅ PASS (0 issues)
- **`c-giu-15-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`c-giu-15-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `c-giu-15-sentence-architect.json` | 4. Sentence Architect (SA) | `s15c5s01` | Expanded Contraction in Accept | Accept variation 'Sorry I am late.' expands contraction 'i'm' from en 'Sorry I'm late.'. | Pending |
| `c-giu-15-sentence-architect.json` | 4. Sentence Architect (SA) | `s15c5s03` | LLM: Noise Word Overlap | The distractor 'broken' appears verbatim in the primary English sentence 'en'.<br>**Suggested Noise:** ['are', 'see', 'break', 'stop'] | Done |
| `c-giu-15-sentence-architect.json` | 4. Sentence Architect (SA) | `s15c5s07` | LLM: Noise Word Overlap | The distractor 'cleaned' appears verbatim in the primary English sentence 'en'.<br>**Suggested Noise:** ['haven't', 'clean', 'cleans'] | Done |
