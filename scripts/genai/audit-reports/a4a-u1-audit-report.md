# Audit Report: Practice JSONs for `v2-data/A4A/a4a-u1`

**Target Directory:** `v2-data/A4A/a4a-u1`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 9

---

## Summary by File

- **`a4a-u1-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a4a-u1-vocab-master.json`**: ⚠️ 4 issue(s)
- **`a4a-u1-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a4a-u1-sentence-architect.json`**: ⚠️ 5 issue(s)
- **`a4a-u1-recall-map.json`**: ✅ PASS (0 issues)
- **`a4a-u1-text-navigator.json`**: ✅ PASS (0 issues)
- **`a4a-u1-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a4a-u1-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a4a-u1-vocab-master.json` | 2. Vocab Master (VM) | `a21gvkc1` | Distractor PoS Mismatch | Question a21gvkc1 (because of sb/sth [phrase]): distractor 'because' has mismatching PoS [other]. | Pending |
| `a4a-u1-vocab-master.json` | 2. Vocab Master (VM) | `zlr5t7zu` | Distractor PoS Mismatch | Question zlr5t7zu (give up [phrase]): distractor 'give' has mismatching PoS [other]. | Pending |
| `a4a-u1-vocab-master.json` | 2. Vocab Master (VM) | `4rwccpku` | Distractor PoS Mismatch | Question 4rwccpku (try your best [phrase]): distractor 'try' has mismatching PoS [other]. | Pending |
| `a4a-u1-vocab-master.json` | 2. Vocab Master (VM) | `0juvqids` | Distractor PoS Mismatch | Question 0juvqids (sports star [phrase]): distractor 'player' has mismatching PoS [other]. | Pending |
| `a4a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `nbdvpine` | Expanded Contraction in Accept | Accept variation 'I am Terry Fox.' expands contraction 'i'm' from en 'I'm Terry Fox.'. | Pending |
| `a4a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `3bd4z1g5` | Expanded Contraction in Accept | Accept variation 'It is hard for me.' expands contraction 'it's' from en 'It's hard for me.'. | Pending |
| `a4a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `1gxi9d99` | Expanded Contraction in Accept | Accept variation 'I am very ill.' expands contraction 'i'm' from en 'But I'm very ill.'. | Pending |
| `a4a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `f7ny03vk` | Expanded Contraction in Accept | Accept variation 'It is OK to fail.' expands contraction 'it's' from en 'It's OK to fail.'. | Pending |
| `a4a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `3bd4z1g5` | LLM: Noise Word Overlap | The noise word 'is' appears verbatim in the primary sentence ('It's' contains 'is').<br>**Suggested Noise:** ['are', 'to'] | Pending |
