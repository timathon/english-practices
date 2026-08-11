# Audit Report: Practice JSONs for `v2-data/B-PU1/b-pu1-u3`

**Target Directory:** `v2-data/B-PU1/b-pu1-u3`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 9

---

## Summary by File

- **`b-pu1-u3-vocab-guide.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-vocab-master.json`**: ⚠️ 5 issue(s), 3 fixed, 2 pending
- **`b-pu1-u3-spelling-hero.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-sentence-architect.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-recall-map.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-text-navigator.json`**: ⚠️ 3 issue(s), 0 fixed, 3 pending
- **`b-pu1-u3-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q202y5z6` | Distractor PoS Mismatch | Question q202y5z6 (new [adj]): distractor 'cow' has mismatching PoS [noun]. | Pending |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q305z1a2` | Distractor PoS Mismatch | Question q305z1a2 (honey [noun]): distractor 'funny' has mismatching PoS [adj]. | Pending |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q305z1a2` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options (like honey, money, bunny) could theoretically fit syntactically, but lacks a Chinese hint.<br>**Suggested Prompt:** `The bees give us ____. (提示: 蜂蜜)`<br>**Suggested Options:** ['honey', 'money', 'funny', 'bunny', 'sunny', 'pony'] | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q403q7r8` | LLM: En2Cn Distractor Language | Question type is Cn2En (prompt is English 'spider'), but prompt should be Chinese and options should match direction correctly.<br>**Suggested Options:** ['spider', 'ant', 'bee', 'butterfly', 'fly', 'mosquito'] | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q410e1f2` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt lacks a Chinese hint, though context makes 'milk' most likely, it's safer to include a hint for primary learners.<br>**Suggested Prompt:** `The cows give us ____. (提示: 牛奶)`<br>**Suggested Options:** ['milk', 'silk', 'bilk', 'ilk', 'milch', 'milks'] | Done |
| `b-pu1-u3-text-navigator.json` | 6. Text Navigator (TN) | `The Friendly Farm:scene6` | Flat Tree Structure | Node 'scene6' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `b-pu1-u3-text-navigator.json` | 6. Text Navigator (TN) | `Literature:part1` | Flat Tree Structure | Node 'part1' has 10 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `b-pu1-u3-text-navigator.json` | 6. Text Navigator (TN) | `Literature:part2` | Flat Tree Structure | Node 'part2' has 11 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
