# Audit Report: Practice JSONs for `v2-data/A4A/a4a-u5`

**Target Directory:** `v2-data/A4A/a4a-u5`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 8

---

## Summary by File

- **`a4a-u5-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a4a-u5-vocab-master.json`**: ⚠️ 7 issue(s), 7 fixed, 0 pending
- **`a4a-u5-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a4a-u5-sentence-architect.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a4a-u5-recall-map.json`**: ✅ PASS (0 issues)
- **`a4a-u5-text-navigator.json`**: ✅ PASS (0 issues)
- **`a4a-u5-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a4a-u5-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a4a-u5-vocab-master.json` | 2. Vocab Master (VM) | `qa0b1c2d` | LLM: Missing Hint in Ambiguous Cloze | Context sentence alone does not uniquely determine the target word among options.<br>**Suggested Prompt:** `____ and far. (提示: 接近的，近的)`<br>**Suggested Options:** ['Hear', 'Fear', 'Near', 'Dear', 'Year', 'Clear'] | Done |
| `a4a-u5-vocab-master.json` | 2. Vocab Master (VM) | `qe4f5g6h` | LLM: Missing Hint in Ambiguous Cloze | Context sentence allows multiple plural nouns (months, miles, meters, minutes, etc.) to fit logically.<br>**Suggested Prompt:** `Let's meet in five ____. (提示: 分钟)`<br>**Suggested Options:** ['menu', 'minutes', 'months', 'miles', 'meters', 'mounts'] | Done |
| `a4a-u5-vocab-master.json` | 2. Vocab Master (VM) | `qh7i8j9k` | LLM: Missing Hint in Ambiguous Cloze | Context sentence alone is ambiguous without a Chinese hint.<br>**Suggested Prompt:** `It's far ____. (提示: 离开，远)`<br>**Suggested Options:** ['always', 'away', 'already', 'again', 'alone', 'along'] | Done |
| `a4a-u5-vocab-master.json` | 2. Vocab Master (VM) | `ql1m2n3o` | LLM: Missing Hint in Ambiguous Cloze | Context sentence alone is ambiguous without a Chinese hint.<br>**Suggested Prompt:** `____, ring, ring. (提示: (钟、铃)鸣响)`<br>**Suggested Options:** ['King', 'Sing', 'Ring', 'Wing', 'Spring', 'Bring'] | Done |
| `a4a-u5-vocab-master.json` | 2. Vocab Master (VM) | `qo4p5q6r` | LLM: Missing Hint in Ambiguous Cloze | Context sentence alone is ambiguous without a Chinese hint.<br>**Suggested Prompt:** `____, whoosh, whoosh. (提示: (呼呼地)飞快移动)`<br>**Suggested Options:** ['Wish', 'Wash', 'Whoosh', 'Push', 'Fish', 'Dish'] | Done |
| `a4a-u5-vocab-master.json` | 2. Vocab Master (VM) | `qz5a6b7c` | LLM: Missing Hint in Ambiguous Cloze | Context sentence alone is ambiguous without a Chinese hint.<br>**Suggested Prompt:** `____, beep, beep. (提示: (使)(汽车喇叭)鸣响)`<br>**Suggested Options:** ['Jeep', 'Sleep', 'Beep', 'Deep', 'Keep', 'Weep'] | Done |
| `a4a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q1b2c3d4` | LLM: Missing Hint in Ambiguous Cloze | Context sentence alone is ambiguous without a Chinese hint.<br>**Suggested Prompt:** `____, chug, chug. (提示: (汽车、火车等)突突地缓慢前进)`<br>**Suggested Options:** ['Jug', 'Mug', 'Chug', 'Rug', 'Bug', 'Hug'] | Done |
| `a4a-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `u5c50009` | LLM: Noise Word Overlap | The noise word 'at' appears verbatim in the sentence 'My sister goes to school in a green way.' (Wait, 'at' is not in the sentence? Let me re-read... Ah, wait, 'at' is not in u5c50009, but let's check: 'My', 'sister', 'goes', 'to', 'school', 'in', 'a', 'green', 'way.'. Wait, 'at' is not in it. Let's check other items.) | Pending |
