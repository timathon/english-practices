# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u1`

**Target Directory:** `v2-data/A8A/a8a-u1`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 7

---

## Summary by File

- **`a8a-u1-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a8a-u1-vocab-master.json`**: ⚠️ 4 issue(s)
- **`a8a-u1-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a8a-u1-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a8a-u1-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u1-text-navigator.json`**: ⚠️ 3 issue(s)
- **`a8a-u1-writing-map.json`**: ✅ PASS (0 issues)
- **`a8a-u1-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u1-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1010010` | Distractor PoS Mismatch | Question q1010010 (take sb's breath away [phrase]): distractor 'breath' has mismatching PoS [noun]. | Pending |
| `a8a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1020007` | Distractor PoS Mismatch | Question q1020007 (ready to do sth [phrase]): distractor 'ready' has mismatching PoS [adj]. | Pending |
| `a8a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1020010` | Distractor PoS Mismatch | Question q1020010 (nothing but [phrase]): distractor 'nothing' has mismatching PoS [noun]. | Pending |
| `a8a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1010007` | LLM: Duplicate Options | The options array contains multiple duplicate entries of the word 'fantastic'.<br>**Suggested Options:** ['fantastic', 'elastic', 'plastic', 'drastic', 'monastic', 'bombastic'] | Pending |
| `a8a-u1-text-navigator.json` | 6. Text Navigator (TN) | `Section B Activity 1b:d1_5` | Nesting Depth Exceeded | Node 'd1_5' at depth 5 exceeds max allowed nesting depth of 4 levels. | Pending |
| `a8a-u1-text-navigator.json` | 6. Text Navigator (TN) | `Section B Activity 1b:d1_7` | Nesting Depth Exceeded | Node 'd1_7' at depth 5 exceeds max allowed nesting depth of 4 levels. | Pending |
| `a8a-u1-text-navigator.json` | 6. Text Navigator (TN) | `Section B Activity 1b:d1_8` | Nesting Depth Exceeded | Node 'd1_8' at depth 5 exceeds max allowed nesting depth of 4 levels. | Pending |
