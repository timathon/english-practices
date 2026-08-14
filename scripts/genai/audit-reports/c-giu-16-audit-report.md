# Audit Report: Practice JSONs for `v2-data/C-GIU/c-giu-11-20/c-giu-16`

**Target Directory:** `v2-data/C-GIU/c-giu-11-20/c-giu-16`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 10

---

## Summary by File

- **`c-giu-16-vocab-guide.json`**: ✅ PASS (0 issues)
- **`c-giu-16-vocab-master.json`**: ⚠️ 10 issue(s), 10 fixed, 0 pending
- **`c-giu-16-spelling-hero.json`**: ✅ PASS (0 issues)
- **`c-giu-16-sentence-architect.json`**: ✅ PASS (0 issues)
- **`c-giu-16-recall-map.json`**: ✅ PASS (0 issues)
- **`c-giu-16-text-navigator.json`**: ✅ PASS (0 issues)
- **`c-giu-16-writing-map.json`**: ✅ PASS (0 issues)
- **`c-giu-16-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`c-giu-16-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q01` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `My hands were dirty because I'd been ______ my bike. (提示: 修理)` | Done |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q02` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `James is out of ______. (提示: 呼吸/气息)` | Done |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q03` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `We'd been playing tennis for about half an hour when it started to rain ______. (提示: 猛烈地/大量地)` | Done |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q04` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `The people waiting at the bus stop were getting ______. (提示: 不耐烦的)` | Done |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q05` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `She'd been having a bad ______. (提示: 梦)` | Done |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q06` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `She was ______ and didn't know where she was. (提示: 害怕的)` | Done |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q07` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `I was disappointed when I had to ______ my holiday. (提示: 取消)` | Done |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q08` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `Soon after the ______ began playing, something strange happened. (提示: 管弦乐队)` | Done |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q09` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `The orchestra had been playing for about ten minutes when a man in the ______ suddenly started shouting. (提示: 观众)` | Done |
| `c-giu-16-vocab-master.json` | 2. Vocab Master (VM) | `v16c1q10` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `He was walking very fast and I had ______ keeping up with him. (提示: 困难)` | Done |
