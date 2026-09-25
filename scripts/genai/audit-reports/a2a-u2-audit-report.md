# Audit Report: Practice JSONs for `v2-data/A2A/a2a-u2`

**Target Directory:** `v2-data/A2A/a2a-u2`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 8

---

## Summary by File

- **`a2a-u2-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a2a-u2-vocab-master.json`**: ⚠️ 7 issue(s), 4 fixed, 3 pending
- **`a2a-u2-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a2a-u2-sentence-architect.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a2a-u2-recall-map.json`**: ✅ PASS (0 issues)
- **`a2a-u2-text-navigator.json`**: ✅ PASS (0 issues)
- **`a2a-u2-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a2a-u2-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a2a-u2-vocab-master.json` | 2. Vocab Master (VM) | `q0j1k2l3` | Distractor PoS Mismatch | Question q0j1k2l3 (food [noun]): distractor 'good' has mismatching PoS [adj]. | Pending |
| `a2a-u2-vocab-master.json` | 2. Vocab Master (VM) | `r9i0j1k2` | Distractor PoS Mismatch | Question r9i0j1k2 (good [adj]): distractor 'food' has mismatching PoS [noun]. | Pending |
| `a2a-u2-vocab-master.json` | 2. Vocab Master (VM) | `s5e6f7g8` | LLM: Invalid Question Type Content | Question type is 'Cn2En' (Chinese to English), but the options provided are English words instead of Chinese translations or distractors in Chinese. Wait, Cn2En options should be English words testing spelling/phonics, but let's check rule 3: Missing Hint in Ambiguous Cloze Questions.<br>**Suggested Options:** ['nice', 'rice', 'mice', 'dice', 'ice', 'price'] | Done |
| `a2a-u2-vocab-master.json` | 2. Vocab Master (VM) | `s9i0j1k2` | LLM: Invalid Question Type Content | Question type is 'Cn2En' (Chinese to English), but options contain English words. For Cn2En, options should typically be English words or definitions depending on the test design, but let's check Cloze questions for ambiguity. | Pending |
| `a2a-u2-vocab-master.json` | 2. Vocab Master (VM) | `r5e6f7g8` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'I like ____.' can logically be completed by many words like 'apple', 'milk', 'bread', etc., and lacks a Chinese meaning hint.<br>**Suggested Prompt:** `I like ____. (提示: 苹果)`<br>**Suggested Options:** ['angle', 'apple', 'ample', 'apply', 'app', 'maple'] | Done |
| `a2a-u2-vocab-master.json` | 2. Vocab Master (VM) | `r8h9i0j1` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'I ____ banana milk!' can accept multiple verbs like 'like', 'love', 'drink', etc. without a Chinese hint.<br>**Suggested Prompt:** `I ____ banana milk! (提示: 爱，喜爱)`<br>**Suggested Options:** ['dove', 'move', 'love', 'glove', 'prove', 'shove'] | Done |
| `a2a-u2-vocab-master.json` | 2. Vocab Master (VM) | `r2b3c4d5` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'The ____ is yummy.' could fit 'cake', 'food', 'bread', etc., lacking a Chinese hint.<br>**Suggested Prompt:** `The ____ is yummy. (提示: 蛋糕)`<br>**Suggested Options:** ['lake', 'nake', 'cake', 'bake', 'make', 'take'] | Done |
| `a2a-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s204g8h9` | LLM: Noise Word Overlap | The noise distractor 'apple' appears verbatim in the sentence 'en' ('apples'), although as a plural variant. Wait, the prompt allows plural/singular variations, but let's check if 'apple' is an exact match. 'apples' contains 'apple'? No, 'apple' is a substring, but let's check the exact word: 'en' is 'I like apples.' The noise word is 'apple'. This is a singular/plural variation, which the instructions explicitly state: 'singular/plural variations... are HIGHLY DESIRABLE GRAMMAR TRAPS. They are NOT overlaps and MUST NOT be flagged as errors!' Let's look closer at items where there is a true exact verbatim word match. | Pending |
