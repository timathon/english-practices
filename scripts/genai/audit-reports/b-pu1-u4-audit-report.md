# Audit Report: Practice JSONs for `v2-data/B-PU1/b-pu1-u4`

**Target Directory:** `v2-data/B-PU1/b-pu1-u4`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 5

---

## Summary by File

- **`b-pu1-u4-vocab-guide.json`**: ✅ PASS (0 issues)
- **`b-pu1-u4-vocab-master.json`**: ⚠️ 3 issue(s), 3 fixed, 0 pending
- **`b-pu1-u4-spelling-hero.json`**: ✅ PASS (0 issues)
- **`b-pu1-u4-sentence-architect.json`**: ⚠️ 1 issue(s), 1 fixed, 0 pending
- **`b-pu1-u4-recall-map.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`b-pu1-u4-text-navigator.json`**: ✅ PASS (0 issues)
- **`b-pu1-u4-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`b-pu1-u4-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `b-pu1-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1001010` | LLM: Duplicate Options | The options list contains a duplicate choice ('salad' appears twice).<br>**Suggested Options:** ['salad', 'solid', 'silent', 'salam', 'sandal', 'soup'] | Done |
| `b-pu1-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1003001` | LLM: Missing Hint in Ambiguous Cloze | Context sentence alone does not uniquely determine the target word 'ingredients' among the options without a Chinese hint.<br>**Suggested Prompt:** `Tick the ____. (提示: 配料)` | Done |
| `b-pu1-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1005009` | LLM: Missing Hint in Ambiguous Cloze | Context sentence alone does not uniquely determine the target word 'carrots' among the options without a Chinese hint.<br>**Suggested Prompt:** `Tick the ingredients: ____. (提示: 胡萝卜)` | Done |
| `b-pu1-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `l1m2n3o4` | LLM: Noise Word Overlap | The noise word 'have' appears verbatim in the sentence 'I'm sorry, I haven't got any apples.'<br>**Suggested Noise:** ['has', 'some', 'is', 'are'] | Done |
| `b-pu1-u4-recall-map.json` | 5. Recall Map (RM) | `stories` | Missing Literature | Stories branch missing required PU1 'Literature' summary sub-branch. | Pending |
