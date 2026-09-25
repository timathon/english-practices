# Audit Report: Practice JSONs for `v2-data/A2A/a2a-u3`

**Target Directory:** `v2-data/A2A/a2a-u3`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 9

---

## Summary by File

- **`a2a-u3-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a2a-u3-vocab-master.json`**: ⚠️ 9 issue(s), 9 fixed, 0 pending
- **`a2a-u3-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a2a-u3-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a2a-u3-recall-map.json`**: ✅ PASS (0 issues)
- **`a2a-u3-text-navigator.json`**: ✅ PASS (0 issues)
- **`a2a-u3-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a2a-u3-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a2a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q0010001` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'What's the ____ like?' can accept multiple words like 'weather', 'feather', etc. contextually or structurally without a Chinese hint.<br>**Suggested Prompt:** `What's the ____ like? (提示: 天气)` | Done |
| `a2a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q0010004` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'It's ____, rainy.' lacks a Chinese meaning hint to narrow down the target adjective among similar options.<br>**Suggested Prompt:** `It's ____, rainy. (提示: 多雨的)` | Done |
| `a2a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q0010007` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'Let's ____ for rainy days.' can be logically completed by multiple verbs without a Chinese hint.<br>**Suggested Prompt:** `Let's ____ for rainy days. (提示: 等待)` | Done |
| `a2a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q0010010` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'Choose five cities in China and ____.' lacks a Chinese hint to specify the action or determiner needed.<br>**Suggested Prompt:** `Choose five cities in China and ____. (提示: 其他的)` | Done |
| `a2a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q0020003` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'Make a ____ about weather around China.' lacks a Chinese hint for the noun.<br>**Suggested Prompt:** `Make a ____ about weather around China. (提示: 海报)` | Done |
| `a2a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q0020006` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'Watch the ____.' can fit multiple media nouns like video, audio, radio, etc. without a Chinese hint.<br>**Suggested Prompt:** `Watch the ____. (提示: 视频)` | Done |
| `a2a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q0020009` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'It's ____, windy.' lacks a Chinese hint.<br>**Suggested Prompt:** `It's ____, windy. (提示: 风大的)` | Done |
| `a2a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q0030004` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'It's ____, sunny.' lacks a Chinese hint.<br>**Suggested Prompt:** `It's ____, sunny. (提示: 阳光充足的)` | Done |
| `a2a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q0030008` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'I have a ____.' can logically fit dish, fish, wish, etc. without a Chinese hint.<br>**Suggested Prompt:** `I have a ____. (提示: 鱼)` | Done |
