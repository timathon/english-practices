# Audit Report: Practice JSONs for `v2-data/A4A/a4a-u2`

**Target Directory:** `v2-data/A4A/a4a-u2`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 5

---

## Summary by File

- **`a4a-u2-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a4a-u2-vocab-master.json`**: ⚠️ 4 issue(s)
- **`a4a-u2-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a4a-u2-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a4a-u2-recall-map.json`**: ✅ PASS (0 issues)
- **`a4a-u2-text-navigator.json`**: ✅ PASS (0 issues)
- **`a4a-u2-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a4a-u2-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a4a-u2-vocab-master.json` | 2. Vocab Master (VM) | `Question Volume` | Volume Deficit | Generated 60 questions; expected target ~70 based on formula (46 items * 1.5). | Pending |
| `a4a-u2-vocab-master.json` | 2. Vocab Master (VM) | `2evllp1g` | Distractor PoS Mismatch | Question 2evllp1g (dirty [adj]): distractor 'clean' has mismatching PoS [verb]. | Question 2evllp1g (dirty [adj]): distractor 'tidy' has mismatching PoS [verb]. | Pending |
| `a4a-u2-vocab-master.json` | 2. Vocab Master (VM) | `y41pxl0p` | Distractor PoS Mismatch | Question y41pxl0p (phew [other]): distractor 'easy' has mismatching PoS [adj]. | Pending |
| `a4a-u2-vocab-master.json` | 2. Vocab Master (VM) | `Vocabulary Coverage` | Missing Item Coverage | The following 1 non-proper vocabulary items were not tested in VM: ['woof'] | Pending |

