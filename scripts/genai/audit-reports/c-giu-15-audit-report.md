# Audit Report: Practice JSONs for `v2-data/C-GIU/c-giu-11-20/c-giu-15`

**Target Directory:** `v2-data/C-GIU/c-giu-11-20/c-giu-15`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 11

---

## Summary by File

- **`c-giu-15-vocab-guide.json`**: ✅ PASS (0 issues)
- **`c-giu-15-vocab-master.json`**: ⚠️ 10 issue(s), 10 fixed, 0 pending
- **`c-giu-15-spelling-hero.json`**: ✅ PASS (0 issues)
- **`c-giu-15-sentence-architect.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`c-giu-15-recall-map.json`**: ✅ PASS (0 issues)
- **`c-giu-15-text-navigator.json`**: ✅ PASS (0 issues)
- **`c-giu-15-writing-map.json`**: ✅ PASS (0 issues)
- **`c-giu-15-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`c-giu-15-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q01` | LLM: Missing Hint in Ambiguous Cloze | The context sentence 'Paul left the party at 10.30 and Sarah ______ at 11 o'clock.' could logically fit other verbs such as left, achieved, or received without the Chinese hint.<br>**Suggested Prompt:** `Paul left the party at 10.30 and Sarah ______ at 11 o'clock. (提示: 到达)` | Done |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q02` | LLM: Missing Hint in Ambiguous Cloze | The context sentence 'At first I thought I'd done the right thing, but I soon ______ that I'd made a big mistake.' can accept other verbs like received or repeated without the Chinese hint.<br>**Suggested Prompt:** `At first I thought I'd done the right thing, but I soon ______ that I'd made a big mistake. (提示: 意识到)` | Done |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q03` | LLM: Missing Hint in Ambiguous Cloze | The sentence 'The people sitting next to me on the plane were ______.' can logically accept multiple adjectives from the options list.<br>**Suggested Prompt:** `The people sitting next to me on the plane were ______. (提示: 紧张的)` | Done |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q04` | LLM: Missing Hint in Ambiguous Cloze | The sentence 'When we got home last night, we found that somebody had broken into the ______.' could potentially fit other nouns like floor.<br>**Suggested Prompt:** `When we got home last night, we found that somebody had broken into the ______. (提示: 公寓)` | Done |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q05` | LLM: Missing Hint in Ambiguous Cloze | The sentence 'She'd ______ to do something else.' is highly ambiguous and can fit managed, arranged, etc.<br>**Suggested Prompt:** `She'd ______ to do something else. (提示: 安排)` | Done |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q06` | LLM: Missing Hint in Ambiguous Cloze | The sentence 'I ______ my friends something to eat, but they weren't hungry.' could accept ordered or other verbs.<br>**Suggested Prompt:** `I ______ my friends something to eat, but they weren't hungry. (提示: 主动提出)` | Done |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q07` | LLM: Missing Hint in Ambiguous Cloze | The sentence 'I went to Laura's house this morning and rang her ______, but there was no answer.' lacks a specific contextual constraint excluding other ringable items or devices without the hint.<br>**Suggested Prompt:** `I went to Laura's house this morning and rang her ______, but there was no answer. (提示: 门铃)` | Done |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q08` | LLM: Missing Hint in Ambiguous Cloze | The sentence 'Yesterday he got a phone call from her. He was ______.' is an ambiguous psychological state description.<br>**Suggested Prompt:** `Yesterday he got a phone call from her. He was ______. (提示: 惊讶的)` | Done |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q09` | LLM: Missing Hint in Ambiguous Cloze | The sentence 'Sorry I'm late. The car ______ on my way here.' can grammatically accept other phrasal verbs like broke up.<br>**Suggested Prompt:** `Sorry I'm late. The car ______ on my way here. (提示: 坏了/出故障)` | Done |
| `c-giu-15-vocab-master.json` | 2. Vocab Master (VM) | `v15c1q10` | LLM: Missing Hint in Ambiguous Cloze | The sentence 'At first I thought I'd done the right thing, but I soon realised that I'd made a big ______.' could logically accept message or mystery without the hint.<br>**Suggested Prompt:** `At first I thought I'd done the right thing, but I soon realised that I'd made a big ______. (提示: 错误)` | Done |
| `c-giu-15-sentence-architect.json` | 4. Sentence Architect (SA) | `s15c5s01` | Expanded Contraction in Accept | Accept variation 'Sorry I am late.' expands contraction 'i'm' from en 'Sorry I'm late.'. | Pending |
