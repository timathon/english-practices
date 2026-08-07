# Audit Report: Practice JSONs for `v2-data/B-PU1/b-pu1-u3`

**Target Directory:** `v2-data/B-PU1/b-pu1-u3`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 14

---

## Summary by File

- **`b-pu1-u3-vocab-guide.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-vocab-master.json`**: ⚠️ 14 issue(s), 12 fixed, 2 pending
- **`b-pu1-u3-spelling-hero.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-sentence-architect.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-recall-map.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-text-navigator.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`b-pu1-u3-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q202y5z6` | Distractor PoS Mismatch | Question q202y5z6 (new [adj]): distractor 'cow' has mismatching PoS [noun]. | Pending |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q305z1a2` | Distractor PoS Mismatch | Question q305z1a2 (honey [noun]): distractor 'funny' has mismatching PoS [adj]. | Pending |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q104g8h9` | LLM: Missing Hint in Ambiguous Cloze | Context sentence 'He's a nice ____.' alone can logically accept multiple animal nouns from the options (e.g., cat, rat, bat), making it ambiguous without a Chinese hint.<br>**Suggested Prompt:** `He's a nice ____. (提示: 猫)` | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q106l3m4` | LLM: Low Quality Distractor | Distractors like 'course' are semantically unrelated or inappropriate for primary school vocabulary levels.<br>**Suggested Options:** ['horse', 'house', 'mouse', 'nurse', 'purse', 'hose'] | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q107n5p6` | LLM: Missing Hint in Ambiguous Cloze | Prompt 'He's a ____. He's small.' can be filled by many small animals (rabbit, monkey, tiger, etc.) without a Chinese hint.<br>**Suggested Prompt:** `He's a ____. He's small. (提示: 蜘蛛)` | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q110u1v2` | LLM: Missing Hint in Ambiguous Cloze | Prompt 'Which ____ is he talking about?' can accept various nouns like 'truck' or 'duck', making it ambiguous without a hint.<br>**Suggested Prompt:** `Which ____ is he talking about? (提示: 鸭子)` | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q206g3h4` | LLM: Missing Hint in Ambiguous Cloze | Prompt lacks a Chinese hint, while context could theoretically fit other adjectives or words although phonetically constrained. Adding a hint ensures unambiguous targeting.<br>**Suggested Prompt:** `Look at my brother and sister. They're ____. (提示: 年轻的)` | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q208k7l8` | LLM: Low Quality Distractor | Distractors such as 'bugly', 'hugly', 'mugly' are nonsense made-up words rather than standard English distractors.<br>**Suggested Options:** ['ugly', 'angry', 'early', 'empty', 'only', 'hungry'] | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q209m9n0` | LLM: Missing Hint in Ambiguous Cloze | Prompt 'He's a ____ dog.' can take multiple descriptive adjectives like sad, bad, mad, etc., making it ambiguous without a hint.<br>**Suggested Prompt:** `He's a ____ dog. (提示: 伤心的)` | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q302t5u6` | LLM: Missing Hint in Ambiguous Cloze | Prompt 'I've got a ____ dog.' can take words like happy, puppy, etc., requiring a hint for clarity.<br>**Suggested Prompt:** `I've got a ____ dog. (提示: 高兴的)` | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q308f7g8` | LLM: Missing Hint in Ambiguous Cloze | Prompt 'It's a ____.' can be filled by numerous singular nouns, making it completely ambiguous without a hint.<br>**Suggested Prompt:** `It's a ____. (提示: 山羊)` | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q401l3m4` | LLM: Missing Hint in Ambiguous Cloze | Prompt 'It's the ____.' can fit many nouns without a hint.<br>**Suggested Prompt:** `It's the ____. (提示: 驴)` | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q404s9t0` | LLM: Low Quality Distractor | Some distractors like 'sickening' and 'bickering' are much too advanced and morphologically complex for primary/middle school chicken vocabulary practice.<br>**Suggested Options:** ['chicken', 'kitchen', 'children', 'Chinese', 'chocolate', 'catch'] | Done |
| `b-pu1-u3-vocab-master.json` | 2. Vocab Master (VM) | `q407y5z6` | LLM: Missing Hint in Ambiguous Cloze | Prompt 'It's a ____ horse.' can fit adjectives like big, fat, old, etc., making a hint necessary.<br>**Suggested Prompt:** `It's a ____ horse. (提示: 大的)` | Done |
