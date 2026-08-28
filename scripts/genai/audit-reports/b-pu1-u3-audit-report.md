# Audit Report: Practice JSONs for `v2-data/B-PU1/b-pu1-u3`

**Target Directory:** `v2-data/B-PU1/b-pu1-u3`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 3

---

## Summary by File

- **`b-pu1-u3-vocab-guide.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-vocab-master.json`**: ⚠️ 3 issue(s)
- **`b-pu1-u3-spelling-hero.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-sentence-architect.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-recall-map.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-text-navigator.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q202y5z6` | Distractor PoS Mismatch | Question q202y5z6 (new [adj]): distractor 'cow' has mismatching PoS [noun]. | Pending |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q305z1a2` | Distractor PoS Mismatch | Question q305z1a2 (honey [noun]): distractor 'funny' has mismatching PoS [adj]. | Pending |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q403q7r8` | LLM: Duplicate Options | The options array contains duplicate choices for 'spider'.<br>**Suggested Options:** ['spider', 'slider', 'speech', 'spiller', 'spire', 'spiderweb'] | Pending |
