# Audit Report: Practice JSONs for `v2-data/A7A/a7a-u6`

**Target Directory:** `v2-data/A7A/a7a-u6`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 7

---

## Summary by File

- **`a7a-u6-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a7a-u6-vocab-master.json`**: ⚠️ 7 issue(s), 3 fixed, 4 pending
- **`a7a-u6-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a7a-u6-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a7a-u6-recall-map.json`**: ✅ PASS (0 issues)
- **`a7a-u6-text-navigator-a2a.json`**: ✅ PASS (0 issues)
- **`a7a-u6-text-navigator-b1b.json`**: ✅ PASS (0 issues)
- **`a7a-u6-writing-map.json`**: ✅ PASS (0 issues)
- **`a7a-u6-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a7a-u6-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a7a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q1001008` | Distractor PoS Mismatch | Question q1001008 (Finnish [adj]): distractor 'finish' has mismatching PoS [other]. | Pending |
| `a7a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q1002001` | Distractor PoS Mismatch | Question q1002001 (finish [other]): distractor 'Finnish' has mismatching PoS [adj]. | Pending |
| `a7a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q1002004` | Distractor PoS Mismatch | Question q1002004 (ice hockey [phrase]): distractor 'hockey' has mismatching PoS [other]. | Pending |
| `a7a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q1005003` | Distractor PoS Mismatch | Question q1005003 (finish [other]): distractor 'Finnish' has mismatching PoS [adj]. | Pending |
| `a7a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q1004007` | LLM: Duplicate Options | The options array contains duplicate choices ('routine' appears twice).<br>**Suggested Options:** ['routine', 'retina', 'ruin', 'route', 'routine', 'rotund'] | Done |
| `a7a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q1007001` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically (e.g., rules, routes, roles), but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `How different are people's daily ____? (提示: 日常生活)` | Done |
| `a7a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q1007003` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple prepositions can fit grammatically (e.g., in, at), but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `I'm ____ duty today. (提示: 值班)` | Done |
