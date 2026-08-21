# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u2`

**Target Directory:** `v2-data/A8A/a8a-u2`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 10

---

## Summary by File

- **`a8a-u2-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a8a-u2-vocab-master.json`**: ⚠️ 5 issue(s)
- **`a8a-u2-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a8a-u2-sentence-architect.json`**: ⚠️ 2 issue(s)
- **`a8a-u2-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u2-text-navigator.json`**: ⚠️ 3 issue(s)
- **`a8a-u2-writing-map.json`**: ✅ PASS (0 issues)
- **`a8a-u2-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u2-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200017` | Distractor PoS Mismatch | Question vu200017 (plan [verb]): distractor 'plate' has mismatching PoS [noun]. | Pending |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200020` | Distractor PoS Mismatch | Question vu200020 (treasure hunt [phrase]): distractor 'hunt' has mismatching PoS [verb]. | Pending |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200034` | Distractor PoS Mismatch | Question vu200034 (journey [verb]): distractor 'balcony' has mismatching PoS [noun]. | Pending |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200074` | Distractor PoS Mismatch | Question vu200074 (pack up [phrase]): distractor 'pack' has mismatching PoS [verb]. | Pending |
| `a8a-u2-vocab-master.json` | 2. Vocab Master (VM) | `vu200050` | LLM: Missing Hint in Ambiguous Cloze | The context sentence alone allows multiple verb options grammatically and semantically (e.g. prepares, brings, offers, has, serves), but lacks a Chinese hint.<br>**Suggested Prompt:** `It always welcomes me with open arms and ____ a plate of freshly-made biscuits. (提示: adv. 也许;可能)` | Pending |
| `a8a-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `u2s21a8a` | LLM: Noise Word Overlap | The noise word 'I' appears verbatim as a capitalized word in the sentence 'en' (or rather, the pronoun 'me' is targeted, but 'I' is a pronoun variant. Wait, checking exact overlap: 'I' is not in the sentence, but let's check exact case-insensitive matches: none. However, let's look at u2s32a8a).<br>**Suggested Noise:** ['takes', 'taking', 'he', 'late'] | Pending |
| `a8a-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `u2s32a8a` | LLM: Noise Word Overlap | The noise word 'mum' appears verbatim in the sentence 'en' ('mum\'s').<br>**Suggested Noise:** ['go', 'goes', 'dad', 'hometowns'] | Pending |
| `a8a-u2-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c2_part1` | Flat Tree Structure | Node 'c2_part1' has 8 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u2-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c2_part2` | Flat Tree Structure | Node 'c2_part2' has 7 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u2-text-navigator.json` | 6. Text Navigator (TN) | `Section A Activity 2a:t7` | Nesting Depth Exceeded | Node 't7' at depth 5 exceeds max allowed nesting depth of 4 levels. | Pending |
