# Audit Report: Practice JSONs for `v2-data/A4A/a4a-u4`

**Target Directory:** `v2-data/A4A/a4a-u4`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 6

---

## Summary by File

- **`a4a-u4-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a4a-u4-vocab-master.json`**: ⚠️ 1 issue(s)
- **`a4a-u4-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a4a-u4-sentence-architect.json`**: ⚠️ 5 issue(s)
- **`a4a-u4-recall-map.json`**: ✅ PASS (0 issues)
- **`a4a-u4-text-navigator.json`**: ✅ PASS (0 issues)
- **`a4a-u4-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a4a-u4-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a4a-u4-vocab-master.json` | 2. Vocab Master (VM) | `mcikptk9` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'I can ____ kites in spring.' has multiple options that can fit grammatically or semantically without a specific Chinese prompt hint, as students need to know whether the base form is requested or if a specific prompt is needed (though 'can' requires base form, other morphs like 'flying' can appear in continuous structures, making a hint best practice for controlled practice). Wait, let's look closer at the prompt: 'I can ____ kites in spring.' Actually, 'can' strictly requires a base verb ('fly'). However, let's check rule 3: 'Evaluate whether the context sentence ALONE allows a student to uniquely pick the correct target word among the options.' With 'can', 'fly' is the ONLY grammatically correct option among [flying, fly, flew, flown, flow, fry] because modal 'can' takes bare infinitive. Thus the context alone uniquely determines 'fly'. No flag needed here.<br>**Suggested Prompt:** `I can ____ kites in spring.`<br>**Suggested Options:** ['flying', 'fly', 'flew', 'flown', 'flow', 'fry'] | Pending |
| `a4a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `a1b2c3d4` | Duplicate ID | Duplicate sentence ID 'a1b2c3d4' found. | Pending |
| `a4a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `e5f6g7h8` | Duplicate ID | Duplicate sentence ID 'e5f6g7h8' found. | Pending |
| `a4a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `i9j0k1l2` | Duplicate ID | Duplicate sentence ID 'i9j0k1l2' found. | Pending |
| `a4a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `m3n4o5p6` | Duplicate ID | Duplicate sentence ID 'm3n4o5p6' found. | Pending |
| `a4a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `q7r8s9t0` | Duplicate ID | Duplicate sentence ID 'q7r8s9t0' found. | Pending |
