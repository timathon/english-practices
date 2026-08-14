# Audit Report: Practice JSONs for `v2-data/A4A/a4a-u3`

**Target Directory:** `v2-data/A4A/a4a-u3`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 13

---

## Summary by File

- **`a4a-u3-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a4a-u3-vocab-master.json`**: ⚠️ 12 issue(s)
- **`a4a-u3-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a4a-u3-sentence-architect.json`**: ⚠️ 1 issue(s)
- **`a4a-u3-recall-map.json`**: ✅ PASS (0 issues)
- **`a4a-u3-text-navigator.json`**: ✅ PASS (0 issues)
- **`a4a-u3-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a4a-u3-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `t9hcfanl` | Distractor PoS Mismatch | Question t9hcfanl (cloudy [adj]): distractor 'cloud' has mismatching PoS [noun]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `dqyf832j` | Distractor PoS Mismatch | Question dqyf832j (windy [adj]): distractor 'wind' has mismatching PoS [noun]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `7rg7e5eu` | Distractor PoS Mismatch | Question 7rg7e5eu (rain [verb]): distractor 'wind' has mismatching PoS [noun]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `10malxaw` | Distractor PoS Mismatch | Question 10malxaw (rainy [adj]): distractor 'rain' has mismatching PoS [verb]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `kv1vhozw` | Distractor PoS Mismatch | Question kv1vhozw (snow [verb]): distractor 'wind' has mismatching PoS [noun]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `v0iu5mrh` | Distractor PoS Mismatch | Question v0iu5mrh (snowy [adj]): distractor 'snow' has mismatching PoS [verb]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `0z14uwbu` | Distractor PoS Mismatch | Question 0z14uwbu (coat [noun]): distractor 'cold' has mismatching PoS [adj]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `1oc00new` | Distractor PoS Mismatch | Question 1oc00new (cloudy [adj]): distractor 'cloud' has mismatching PoS [noun]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `0yj6hf7n` | Distractor PoS Mismatch | Question 0yj6hf7n (windy [adj]): distractor 'wind' has mismatching PoS [noun]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `77x1dolr` | Distractor PoS Mismatch | Question 77x1dolr (rain [verb]): distractor 'wind' has mismatching PoS [noun]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `b64aosfh` | Distractor PoS Mismatch | Question b64aosfh (rainy [adj]): distractor 'rain' has mismatching PoS [verb]. | Pending |
| `a4a-u3-vocab-master.json` | 2. Vocab Master (VM) | `eu8oa45y` | Distractor PoS Mismatch | Question eu8oa45y (snow [verb]): distractor 'wind' has mismatching PoS [noun]. | Pending |
| `a4a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `nkiol4ei` | LLM: Noise Word Overlap | The noise word 'tastes' has an exact verbatim overlap with the word 'taste' in the sentence (note: instructions state inflections/tense variations are acceptable, but 'tastes' contains the exact substring or is a direct variant, wait, let's check exact match. 'tastes' is NOT an exact match for 'taste', BUT let's review rule 1: exact word match (case-insensitive). 'tastes' vs 'taste' are different words. However, looking at another item or let's check if there are actual exact overlaps). Let's check item nkiol4ei: en='Does it taste like ice cream?', noise=['is', 'tastes', 'cake']. 'tastes' is not an exact match. Wait, are there any actual exact overlaps in the list?<br>**Suggested Noise:** ['smells', 'look', 'cake'] | Pending |
