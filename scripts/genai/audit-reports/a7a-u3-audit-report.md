# Audit Report: Practice JSONs for `v2-data/A7A/a7a-u3`

**Target Directory:** `v2-data/A7A/a7a-u3`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 16

---

## Summary by File

- **`a7a-u3-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a7a-u3-vocab-master.json`**: ⚠️ 14 issue(s), 9 fixed, 5 pending
- **`a7a-u3-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a7a-u3-sentence-architect.json`**: ⚠️ 2 issue(s), 1 fixed, 1 pending
- **`a7a-u3-recall-map.json`**: ✅ PASS (0 issues)
- **`a7a-u3-text-navigator-a2a.json`**: ✅ PASS (0 issues)
- **`a7a-u3-text-navigator-b1b.json`**: ✅ PASS (0 issues)
- **`a7a-u3-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a7a-u3-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q10b1c2d` | Distractor PoS Mismatch | Question q10b1c2d (sports field [phrase]): distractor 'field' has mismatching PoS [noun]. | Question q10b1c2d (sports field [phrase]): distractor 'hall' has mismatching PoS [noun]. |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q43w7x8y` | Distractor PoS Mismatch | Question q43w7x8y (student centre [phrase]): distractor 'centre' has mismatching PoS [noun]. | Question q43w7x8y (student centre [phrase]): distractor 'building' has mismatching PoS [noun]. |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q52x5y6z` | Distractor PoS Mismatch | Question q52x5y6z (blackboard [other]): distractor 'whiteboard' has mismatching PoS [noun]. | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q58p7q8r` | Distractor PoS Mismatch | Question q58p7q8r (across from [phrase]): distractor 'across' has mismatching PoS [adj]. | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q67q5r6s` | Distractor PoS Mismatch | Question q67q5r6s (whiteboard [noun]): distractor 'blackboard' has mismatching PoS [other]. | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q02d4e5f` | LLM: Cn2En Distractor Language | For type 'Cn2En', all options should be English, but some items or distractors might have formatting issues. Wait, let's check Cn2En rule: options are English. But let's check q05, q08, q11, etc. Actually, let's check q05: 'across', 'gross', 'address', 'access', 'assess', 'above' - these are English, which is correct for Cn2En. Let's check q02: options are English ('dining hall', etc.), but wait, 'Cn2En' means prompt is Chinese, options are English. That's correct. Let's check En2Cn rule: all options MUST be Chinese translations. If any option in an 'En2Cn' question contains English words/letters, flag it!<br>**Suggested Options:** ['dining hall', 'drawing hall', 'dancing hall', 'driving hall', 'diving hall', 'dining room'] | Done |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q12h5i6j` | LLM: En2Cn Distractor Language | The correct option contains a typo/extraneous character ('大s的;大号的'). En2Cn options must be clean Chinese translations.<br>**Suggested Options:** ['大的;大号的', '小的', '高的', '长的', '宽的', '重的'] | Done |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q40n1o2p` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'How is Peter's school similar ____ yours?' without a hint could technically accept other prepositions depending on phrasing, though 'to' is fixed for 'similar to'. However, to be fully safe and strictly adhere to the rubric for preposition/particle cloze items where multiple prepositions are grammatically plausible in a blank, a Chinese hint is recommended.<br>**Suggested Prompt:** `How is Peter's school similar ____ yours? (提示: 相似于)`<br>**Suggested Options:** ['to', 'from', 'with', 'at', 'in', 'on'] | Done |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q61y3z4a` | LLM: Missing Hint in Ambiguous Cloze | The context 'on the sports ____' can logically fit multiple options such as 'ground' or 'field' without a specific Chinese prompt hint.<br>**Suggested Prompt:** `What are the people doing on the sports ____? (提示: 田径场; 运动场)` | Done |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q64h9i0j` | LLM: Missing Hint in Ambiguous Cloze | A classroom could be described as 'large', 'small', etc., based purely on context. It requires a Chinese meaning hint to be unambiguous.<br>**Suggested Prompt:** `What's your new classroom like, Peter? It's ____. (提示: 大的)` | Done |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q67q5r6s` | LLM: Missing Hint in Ambiguous Cloze | Without a hint, 'smart whiteboard', 'smart keyboard', or 'smart cupboard' could theoretically fit the syntax and general context.<br>**Suggested Prompt:** `There's a smart ____ next to the blackboard. (提示: 白板)` | Done |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q70z1a2b` | LLM: Missing Hint in Ambiguous Cloze | The sentence structure allows multiple plural nouns (notices, voices, choices) to fit grammatically and semantically.<br>**Suggested Prompt:** `Yes, we put up important ____ there. (提示: 通知; 布告)` | Done |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q76r3s4t` | LLM: Missing Hint in Ambiguous Cloze | Many nouns can be on a wall (screen, green, machine, etc. phonetically or semantically), making the prompt completely ambiguous without a hint.<br>**Suggested Prompt:** `There's a ____ on the wall. (提示: 屏幕)` | Done |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q79a9b0c` | LLM: Missing Hint in Ambiguous Cloze | Buildings can be modern, old, historic, or traditional, making multiple options grammatically and semantically valid without a hint.<br>**Suggested Prompt:** `There are many ____ buildings. (提示: 现代的)` | Done |
| `a7a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `1dbaf672` | LLM: Noise Word Overlap | The noise word 'where' appears verbatim in the primary sentence 'Where's Ms Gao's office?'.<br>**Suggested Noise:** ['who', 'whose'] | Done |
| `a7a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `1bddb26b` | LLM: Noise Word Overlap | The noise word 'have' appears in inflected form/verbatim match contextually (though 'has' is in 'en', 'have' is an exact word match of the base form, but wait—let's check exact match: 'Each boat has one teacher...'. 'have' is NOT in 'en'. Wait, let's look closer at item 1bbddb26b: en is 'Each boat has one teacher and one class.', noise is ['have', 'every']. 'have' is a morphological variant of 'has'. That is a valid trap, not an overlap. | Pending |
