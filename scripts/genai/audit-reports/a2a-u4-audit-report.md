# Audit Report: Practice JSONs for `v2-data/A2A/a2a-u4`

**Target Directory:** `v2-data/A2A/a2a-u4`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 7

---

## Summary by File

- **`a2a-u4-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a2a-u4-vocab-master.json`**: ⚠️ 7 issue(s), 7 fixed, 0 pending
- **`a2a-u4-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a2a-u4-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a2a-u4-recall-map.json`**: ✅ PASS (0 issues)
- **`a2a-u4-text-navigator.json`**: ✅ PASS (0 issues)
- **`a2a-u4-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a2a-u4-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a2a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1001a1b` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'It's ____.' is ambiguous because multiple options (spring, summer, autumn, winter) fit grammatically and semantically, but it lacks a Chinese hint.<br>**Suggested Prompt:** `It's ____. (提示: 春天)`<br>**Suggested Options:** ['spring', 'summer', 'autumn', 'winter', 'season', 'year'] | Done |
| `a2a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1004d4e` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'It's winter.' already contains the answer in the prompt, making it a trivial copy-paste rather than a vocabulary test, or if intended as a fill-in, multiple seasonal words fit.<br>**Suggested Prompt:** `It's ____. (提示: 冬天)`<br>**Suggested Options:** ['winter', 'summer', 'spring', 'autumn', 'weather', 'season'] | Done |
| `a2a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1007g7h` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'Lots of colours!' already contains 'Lots', making the blank trivial or ambiguous for rhyming distractors without a meaning hint.<br>**Suggested Prompt:** `____ of colours! (提示: 许多)`<br>**Suggested Options:** ['Lots', 'Hots', 'Pots', 'Nots', 'Cots', 'Dots'] | Done |
| `a2a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1010j0k` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'Look at that ____.' can logically accept multiple rhyming nouns (cat, hat, rat, mat) without a specific Chinese hint.<br>**Suggested Prompt:** `Look at that ____. (提示: 帽子)`<br>**Suggested Options:** ['cat', 'bat', 'hat', 'rat', 'mat', 'fat'] | Done |
| `a2a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q2003c3d` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'Let's ____!' can accept multiple rhyming verbs (day, say, play, way, pay) without a semantic hint.<br>**Suggested Prompt:** `Let's ____! (提示: 玩，玩耍)`<br>**Suggested Options:** ['day', 'say', 'play', 'way', 'may', 'pay'] | Done |
| `a2a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q2006f6g` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'Draw four seasons and the ____.' could theoretically accept other nouns though weather is contextually targeted; adding a hint ensures clarity.<br>**Suggested Prompt:** `Draw four seasons and the ____. (提示: 天气)`<br>**Suggested Options:** ['whether', 'weather', 'feather', 'leather', 'together', 'neither'] | Done |
| `a2a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q2009i9j` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'Children are flying a ____.' can accept 'kite' or 'bike' contextually if children are playing with bikes, making a semantic hint necessary.<br>**Suggested Prompt:** `Children are flying a ____. (提示: 风筝)`<br>**Suggested Options:** ['bike', 'kite', 'white', 'like', 'night', 'right'] | Done |
