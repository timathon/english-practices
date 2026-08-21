# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u5`

**Target Directory:** `v2-data/A8A/a8a-u5`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 14

---

## Summary by File

- **`a8a-u5-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a8a-u5-vocab-master.json`**: ⚠️ 10 issue(s)
- **`a8a-u5-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a8a-u5-sentence-architect.json`**: ⚠️ 1 issue(s)
- **`a8a-u5-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u5-text-navigator.json`**: ⚠️ 3 issue(s)
- **`a8a-u5-writing-map.json`**: ✅ PASS (0 issues)
- **`a8a-u5-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u5-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0100107` | Distractor PoS Mismatch | Question q0100107 (flour [noun]): distractor 'sour' has mismatching PoS [adj]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0300108` | Distractor PoS Mismatch | Question q0300108 (sour [adj]): distractor 'flour' has mismatching PoS [noun]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0400104` | Distractor PoS Mismatch | Question q0400104 (dream [verb]): distractor 'cream' has mismatching PoS [noun]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500102` | Distractor PoS Mismatch | Question q0500102 (warm up [phrase]): distractor 'heat' has mismatching PoS [verb]. | Question q0500102 (warm up [phrase]): distractor 'mix' has mismatching PoS [verb]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500109` | Distractor PoS Mismatch | Question q0500109 (hostess [noun]): distractor 'host' has mismatching PoS [verb]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500110` | Distractor PoS Mismatch | Question q0500110 (cream [noun]): distractor 'dream' has mismatching PoS [verb]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q1000104` | Distractor PoS Mismatch | Question q1000104 (put sth back [phrase]): distractor 'mix' has mismatching PoS [verb]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0400104` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options (dream, cream, team) could fit or lack unique contextual constraint, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `Sue got into her ____ (提示: 梦想的) university!`<br>**Suggested Options:** ['dream', 'cream', 'team', 'stream', 'gleam', 'beam'] | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500102` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options can form phrasal verbs with up (warm up, cool up, heat up), but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `Her friendly kitchen was the perfect place to ____ (提示: 暖和) up.`<br>**Suggested Options:** ['warm', 'cool', 'heat', 'mix', 'wash', 'clean'] | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0600104` | LLM: En2Cn Option Language Rule | For type 'En2Cn', all options MUST be Chinese translations, but option 0 contains English words ('at least').<br>**Suggested Options:** ['至少; 不少于', '逐个地; 逐一地', '除...以外(还); 与...同样地', '根据; 依照', '(使)活跃起来; 热身; 预热', '(使)充满; (使)填满'] | Pending |
| `a8a-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u53031` | LLM: Noise Word Overlap | The distractor 'smell' appears verbatim in the sentence 'en' ('Smells and taste connect us to each other.').<br>**Suggested Noise:** ['flavor', 'recipe', 'aroma'] | Pending |
| `a8a-u5-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c1_p1` | Flat Tree Structure | Node 'c1_p1' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u5-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c1_p2` | Flat Tree Structure | Node 'c1_p2' has 10 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u5-text-navigator.json` | 6. Text Navigator (TN) | `Section B Activity 1b:para1_love` | Flat Tree Structure | Node 'para1_love' has 7 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
