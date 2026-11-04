# Audit Report: Practice JSONs for `v2-data/B-PU1/b-pu1-u7`

**Target Directory:** `v2-data/B-PU1/b-pu1-u7`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 16

---

## Summary by File

- **`b-pu1-u7-vocab-guide.json`**: ✅ PASS (0 issues)
- **`b-pu1-u7-vocab-master.json`**: ⚠️ 15 issue(s), 4 fixed, 11 pending
- **`b-pu1-u7-spelling-hero.json`**: ✅ PASS (0 issues)
- **`b-pu1-u7-sentence-architect.json`**: ✅ PASS (0 issues)
- **`b-pu1-u7-recall-map.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`b-pu1-u7-text-navigator.json`**: ✅ PASS (0 issues)
- **`b-pu1-u7-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`b-pu1-u7-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `c1b2c3d9` | Distractor PoS Mismatch | Question c1b2c3d9 (run [verb]): distractor 'badminton' has mismatching PoS [noun]. | Question c1b2c3d9 (run [verb]): distractor 'skateboard' has mismatching PoS [noun]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `c1b2c3da` | Distractor PoS Mismatch | Question c1b2c3da (skateboard [noun]): distractor 'stretch' has mismatching PoS [verb]. | Question c1b2c3da (skateboard [noun]): distractor 'jump' has mismatching PoS [verb]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `c1b2c3db` | Distractor PoS Mismatch | Question c1b2c3db (hockey [noun]): distractor 'stretch' has mismatching PoS [verb]. | Question c1b2c3db (hockey [noun]): distractor 'jump' has mismatching PoS [verb]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d4` | Distractor PoS Mismatch | Question d1b2c3d4 (exercise [verb]): distractor 'bone' has mismatching PoS [noun]. | Question d1b2c3d4 (exercise [verb]): distractor 'muscle' has mismatching PoS [noun]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d5` | Distractor PoS Mismatch | Question d1b2c3d5 (bone [noun]): distractor 'exercise' has mismatching PoS [verb]. | Question d1b2c3d5 (bone [noun]): distractor 'sun cream' has mismatching PoS [phrase]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d6` | Distractor PoS Mismatch | Question d1b2c3d6 (muscle [noun]): distractor 'exercise' has mismatching PoS [verb]. | Question d1b2c3d6 (muscle [noun]): distractor 'sun cream' has mismatching PoS [phrase]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d7` | Distractor PoS Mismatch | Question d1b2c3d7 (sun cream [phrase]): distractor 'exercise' has mismatching PoS [verb]. | Question d1b2c3d7 (sun cream [phrase]): distractor 'bone' has mismatching PoS [noun]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d8` | Distractor PoS Mismatch | Question d1b2c3d8 (exercise [verb]): distractor 'bone' has mismatching PoS [noun]. | Question d1b2c3d8 (exercise [verb]): distractor 'muscle' has mismatching PoS [noun]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d9` | Distractor PoS Mismatch | Question d1b2c3d9 (bone [noun]): distractor 'exercise' has mismatching PoS [verb]. | Question d1b2c3d9 (bone [noun]): distractor 'sun cream' has mismatching PoS [phrase]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3da` | Distractor PoS Mismatch | Question d1b2c3da (muscle [noun]): distractor 'exercise' has mismatching PoS [verb]. | Question d1b2c3da (muscle [noun]): distractor 'sun cream' has mismatching PoS [phrase]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3db` | Distractor PoS Mismatch | Question d1b2c3db (sun cream [phrase]): distractor 'exercise' has mismatching PoS [verb]. | Question d1b2c3db (sun cream [phrase]): distractor 'bone' has mismatching PoS [noun]. |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d4` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options (such as stretch, jump, etc.) could logically fit the context, but the prompt lacks a Chinese hint.<br>**Suggested Prompt:** `Children need to ____ every day. (提示: 锻炼，运动)` | Done |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d5` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because both bone and muscle could logically fit the context 'make your ... strong', but the prompt lacks a Chinese hint.<br>**Suggested Prompt:** `Running and playing football help make your ____ strong. (提示: 骨头)` | Done |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d6` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple body parts or components could fit, but the prompt lacks a Chinese hint.<br>**Suggested Prompt:** `Exercise makes your bones and ____ strong. (提示: 肌肉)` | Done |
| `b-pu1-u7-vocab-master.json` | 2. Vocab Master (VM) | `d1b2c3d7` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous as it lacks a Chinese hint to specify the exact target noun.<br>**Suggested Prompt:** `Remember to use ____ when you are in the sun! (提示: 防晒霜)` | Done |
| `b-pu1-u7-recall-map.json` | 5. Recall Map (RM) | `stories` | Missing Literature | Stories branch missing required PU1 'Literature' summary sub-branch. | Pending |
