# Audit Report: Practice JSONs for `v2-data/A7A/a7a-u4`

**Target Directory:** `v2-data/A7A/a7a-u4`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 19

---

## Summary by File

- **`a7a-u4-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a7a-u4-vocab-master.json`**: ⚠️ 12 issue(s), 6 fixed, 6 pending
- **`a7a-u4-spelling-hero.json`**: ⚠️ 4 issue(s), 3 fixed, 1 pending
- **`a7a-u4-sentence-architect.json`**: ⚠️ 1 issue(s), 1 fixed, 0 pending
- **`a7a-u4-recall-map.json`**: ✅ PASS (0 issues)
- **`a7a-u4-text-navigator-a2a.json`**: ✅ PASS (0 issues)
- **`a7a-u4-text-navigator-b1b.json`**: ✅ PASS (0 issues)
- **`a7a-u4-writing-map-model-1.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a7a-u4-writing-map-model-2.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a7a-u4-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a7a-u4-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `r9i0j1k2` | Distractor PoS Mismatch | Question r9i0j1k2 (French [adj]): distractor 'biology' has mismatching PoS [noun]. | Question r9i0j1k2 (French [adj]): distractor 'geography' has mismatching PoS [noun]. |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `s9i0j1k2` | Distractor PoS Mismatch | Question s9i0j1k2 (magic [adj]): distractor 'subject' has mismatching PoS [noun]. | Question s9i0j1k2 (magic [adj]): distractor 'history' has mismatching PoS [noun]. |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `u1a2b3c4` | Distractor PoS Mismatch | Question u1a2b3c4 (remember [verb]): distractor 'listen to' has mismatching PoS [phrase]. | Question u1a2b3c4 (remember [verb]): distractor 'work out' has mismatching PoS [phrase]. |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `u4d5e6f7` | Distractor PoS Mismatch | Question u4d5e6f7 (work out [phrase]): distractor 'remember' has mismatching PoS [verb]. | Pending |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `u5e6f7g8` | Distractor PoS Mismatch | Question u5e6f7g8 (remember [verb]): distractor 'listen to' has mismatching PoS [phrase]. | Question u5e6f7g8 (remember [verb]): distractor 'work out' has mismatching PoS [phrase]. |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `u8h9i0j1` | Distractor PoS Mismatch | Question u8h9i0j1 (work out [phrase]): distractor 'remember' has mismatching PoS [verb]. | Pending |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1a2b3c4` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple school subjects fit grammatically and semantically, but lacks Chinese hint in the prompt.<br>**Suggested Prompt:** `Match the school subjects in the box with the pictures: art, ____, Chinese, IT, English, geography, history, maths, music, PE. (提示: 生物学)` | Done |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q4d5e6f7` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous as multiple school subjects can fit, but lacks Chinese hint.<br>**Suggested Prompt:** `I have ____ on Tuesday mornings. (提示: 历史; 历史课)` | Done |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `r9i0j1k2` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous as multiple subjects fit the list, but lacks Chinese hint.<br>**Suggested Prompt:** `I study maths, music, ____, history, English, IT, science, and have gym. (提示: 法语)` | Done |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `s5e6f7g8` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous as multiple time nouns could fit, but lacks Chinese hint.<br>**Suggested Prompt:** `This ____, I have subjects like Chinese, history, maths, English, PE, and IT. (提示: 学期)` | Done |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `v2b3c4d5` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous as multiple subjects can fit, but lacks Chinese hint.<br>**Suggested Prompt:** `Peter has ____ and PE today. (提示: 信息技术)` | Done |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `v8h9i0j1` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous as multiple nouns could fit, but lacks Chinese hint.<br>**Suggested Prompt:** `It's interesting to learn about the ____. (提示: 过去; 过去的事情)` | Done |
| `a7a-u4-spelling-hero.json` | 3. Spelling Hero (SH) | `Coverage` | Missing Single Words | Single-word vocabulary items missing from Spelling Hero: {'AM', 'IT', 'PM'} | Pending |
| `a7a-u4-spelling-hero.json` | 3. Spelling Hero (SH) | `excellent_chunk_2` | Duplicate Options | Chunk options contain duplicates: ['lent', 'lant', 'lent'] | Done |
| `a7a-u4-spelling-hero.json` | 3. Spelling Hero (SH) | `future_chunk_1` | Duplicate Options | Chunk options contain duplicates: ['ture', 'ture', 'ture'] | Done |
| `a7a-u4-spelling-hero.json` | 3. Spelling Hero (SH) | `magic_chunk_1` | Duplicate Options | Chunk options contain duplicates: ['gic', 'gic', 'gic'] | Done |
| `a7a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `s4u1c410` | LLM: Noise Word Overlap | The noise word 'problems' appears verbatim in the primary sentence 'en' ('We learn how to work out maths problems.').<br>**Suggested Noise:** ['questions', 'equations'] | Done |
| `a7a-u4-writing-map-model-1.json` | 7. Model Writing Map (MWM) | `sections` | Missing Sections | Top-level object must contain a non-empty 'sections' array. | Pending |
| `a7a-u4-writing-map-model-2.json` | 7. Model Writing Map (MWM) | `sections` | Missing Sections | Top-level object must contain a non-empty 'sections' array. | Pending |
