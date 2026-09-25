# Audit Report: Practice JSONs for `v2-data/A2A/a2a-u1`

**Target Directory:** `v2-data/A2A/a2a-u1`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 17

---

## Summary by File

- **`a2a-u1-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a2a-u1-vocab-master.json`**: ⚠️ 14 issue(s), 14 fixed, 0 pending
- **`a2a-u1-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a2a-u1-sentence-architect.json`**: ⚠️ 3 issue(s), 3 fixed, 0 pending
- **`a2a-u1-recall-map.json`**: ✅ PASS (0 issues)
- **`a2a-u1-text-navigator.json`**: ✅ PASS (0 issues)
- **`a2a-u1-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a2a-u1-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1026c8aa` | ID Format | Question ID 'q1026c8aa' is not an 8-character alphanumeric string. | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1027c9ab` | ID Format | Question ID 'q1027c9ab' is not an 8-character alphanumeric string. | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1028d1ac` | ID Format | Question ID 'q1028d1ac' is not an 8-character alphanumeric string. | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1029d2ad` | ID Format | Question ID 'q1029d2ad' is not an 8-character alphanumeric string. | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1030d3ae` | ID Format | Question ID 'q1030d3ae' is not an 8-character alphanumeric string. | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1001a1b` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options (sad, bad, mad, fat) fit grammatically and semantically, but lacks Chinese hint.<br>**Suggested Prompt:** `She is ____. (提示: 伤心的)` | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1002a2c` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options (angry, hungry, happy, heavy) fit grammatically and semantically, but lacks Chinese hint.<br>**Suggested Prompt:** `She is ____! (提示: 生气的)` | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1003a3d` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint.<br>**Suggested Prompt:** `She is ____. (提示: 疲倦的)` | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1009a9j` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options (clock, block, lock, rock, sock) can follow 'seven', but lacks Chinese hint.<br>**Suggested Prompt:** `It's seven ____. (提示: 点钟)` | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1010b1k` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options can fit grammatically, but lacks Chinese hint.<br>**Suggested Prompt:** `I ____ to go to bed. (提示: 想要)` | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1015b6p` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple family member nouns fit, but lacks Chinese hint.<br>**Suggested Prompt:** `Happy birthday, ____! (提示: 爷爷)` | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1016b7q` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple nouns fit the greeting, but lacks Chinese hint.<br>**Suggested Prompt:** `Happy ____, Kate! (提示: 生日)` | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1019c1t` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple adjectives fit, but lacks Chinese hint.<br>**Suggested Prompt:** `It's a ____ show! (提示: 美好的)` | Done |
| `a2a-u1-vocab-master.json` | 2. Vocab Master (VM) | `q1020c2u` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple interjections/verbs fit, but lacks Chinese hint.<br>**Suggested Prompt:** `____! She is happy. (提示: 看)` | Done |
| `a2a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `6p515w4v` | LLM: Noise Word Overlap | The noise word 'face' appears verbatim in the primary sentence 'en' ('Listen and draw faces.' contains the plural 'faces', which matches the singular noise word 'face' or shares the exact base word overlap).<br>**Suggested Noise:** ['Hear', 'paint', 'head', 'hand'] | Done |
| `a2a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `0wbc0lef` | LLM: Noise Word Overlap | The noise word 'head' or 'speak' might be okay, but check closely: 'faces' is in 'en', and 'head' is fine, but wait—let's check '8klb00ij'.<br>**Suggested Noise:** ['Join', 'paint', 'talk', 'hand'] | Done |
| `a2a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `8klb00ij` | LLM: Noise Word Overlap | The noise word 'clock' appears verbatim in the primary sentence 'en' ('It\'s seven o\'clock.').<br>**Suggested Noise:** ['That', 'six', 'hour', 'watch'] | Done |
