# Audit Report: Practice JSONs for `v2-data/A2A/a2a-u6`

**Target Directory:** `v2-data/A2A/a2a-u6`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 7

---

## Summary by File

- **`a2a-u6-vocab-guide.json`**: ⚠️ 2 issue(s), 0 fixed, 2 pending
- **`a2a-u6-vocab-master.json`**: ⚠️ 4 issue(s), 4 fixed, 0 pending
- **`a2a-u6-spelling-hero.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a2a-u6-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a2a-u6-recall-map.json`**: ✅ PASS (0 issues)
- **`a2a-u6-text-navigator.json`**: ✅ PASS (0 issues)
- **`a2a-u6-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a2a-u6-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a2a-u6-vocab-guide.json` | 1. Vocab Guide Extraction (VGE) | `paper-cut` | IPA Format | IPA '' is not enclosed in forward slashes /.../. | Pending |
| `a2a-u6-vocab-guide.json` | 1. Vocab Guide Extraction (VGE) | `jiaozi` | IPA Format | IPA '' is not enclosed in forward slashes /.../. | Pending |
| `a2a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q1a2b3c4` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'Let's make ____!' can logically accept multiple items as things you can make (kites, cards, coats, etc.), but lacks a Chinese hint to specify the exact target word.<br>**Suggested Prompt:** `Let's make ____! (提示: 剪纸)` | Done |
| `a2a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q2b3c4d5` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt 'Let's put ____ the paper-cuts!' can take multiple prepositions/adverbs phrasally (down, in, out, on, off), but lacks a Chinese hint.<br>**Suggested Prompt:** `Let's put ____ the paper-cuts! (提示: 向上，张贴)` | Done |
| `a2a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q5e6f7g8` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt could logically fit other objects suitable for Children's Day, but lacks a Chinese hint.<br>**Suggested Prompt:** `Look at my ____. It's for Children's Day. (提示: 卡片，贺卡)` | Done |
| `a2a-u6-vocab-master.json` | 2. Vocab Master (VM) | `q9i0j1k2` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt can accept various plural clothing items (hats, shirts, shoes, etc.), but lacks a Chinese hint.<br>**Suggested Prompt:** `Let's put on red ____ (提示: 外套)` | Done |
| `a2a-u6-spelling-hero.json` | 3. Spelling Hero (SH) | `Coverage` | Missing Single Words | Single-word vocabulary items missing from Spelling Hero: {'jiaozi'} | Pending |
