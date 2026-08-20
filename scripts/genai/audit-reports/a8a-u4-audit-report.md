# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u4`

**Target Directory:** `v2-data/A8A/a8a-u4`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 16

---

## Summary by File

- **`a8a-u4-vocab-guide.json`**: ⚠️ 1 issue(s), 1 fixed, 0 pending
- **`a8a-u4-vocab-master.json`**: ⚠️ 14 issue(s), 14 fixed, 0 pending
- **`a8a-u4-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a8a-u4-sentence-architect.json`**: ⚠️ 1 issue(s), 1 fixed, 0 pending
- **`a8a-u4-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u4-text-navigator.json`**: ✅ PASS (0 issues)
- **`a8a-u4-writing-map.json`**: ✅ PASS (0 issues)
- **`a8a-u4-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u4-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u4-vocab-guide.json` | 1. Vocab Guide Extraction (VGE) | `kg` | IPA Format | IPA 'NA' is not enclosed in forward slashes /.../. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q100w9x0y` | ID Format | Question ID 'q100w9x0y' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q101z1a2b` | ID Format | Question ID 'q101z1a2b' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q102c3d4e` | ID Format | Question ID 'q102c3d4e' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q103f5g6h` | ID Format | Question ID 'q103f5g6h' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q104i7j8k` | ID Format | Question ID 'q104i7j8k' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q105l9m0n` | ID Format | Question ID 'q105l9m0n' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q106p1q2r` | ID Format | Question ID 'q106p1q2r' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q107s3t4u` | ID Format | Question ID 'q107s3t4u' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q108v5w6x` | ID Format | Question ID 'q108v5w6x' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q109y7z8a` | ID Format | Question ID 'q109y7z8a' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q110b9c0d` | ID Format | Question ID 'q110b9c0d' is not an 8-character alphanumeric string. | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q12i3j4k` | LLM: Missing Hint in Ambiguous Cloze | Cloze prompt 'Actually we eat bamboo ____ too.' has multiple rhyming/phonetic valid words depending on meaning, although a hint is provided inside the prompt text, it should ideally be formatted consistently or checked for ambiguity. Wait, the prompt already includes '(提示: 幼苗)'. Let's check other cloze questions.<br>**Suggested Prompt:** ` (提示: 幼苗) Actually we eat bamboo ____ too.` | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q52c3d4e` | LLM: Low Quality Distractor | Distractor options include offensive or inappropriate terms like '龟头' for a primary/middle school English practice unit.<br>**Suggested Options:** ['标题；题目；名称', '小小的', '尾巴', '乌龟', '吉他', '领带'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q108v5w6x` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'Add the endings to form nouns: ____...' is completely ambiguous because 'business', 'happiness', 'fitness', 'illness', 'darkness', and 'sadness' are all perfectly valid nouns formed by adding the '-ness' suffix to various bases. Without a specific Chinese hint, any of them is logically correct.<br>**Suggested Prompt:** `Add the endings to form nouns: ____... (提示: 幸福)` | Done |
| `a8a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `bmc97c7b` | LLM: Noise Word Overlap | The noise word 'more' appears verbatim in the English sentence ('anymore').<br>**Suggested Noise:** ['was', 'can', 'some', 'much'] | Done |
