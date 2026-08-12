# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u8`

**Target Directory:** `v2-data/A8A/a8a-u8`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 11

---

## Summary by File

- **`a8a-u8-vocab-guide.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a8a-u8-vocab-master.json`**: ⚠️ 4 issue(s), 0 fixed, 4 pending
- **`a8a-u8-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a8a-u8-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a8a-u8-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u8-text-navigator.json`**: ⚠️ 6 issue(s), 0 fixed, 6 pending
- **`a8a-u8-writing-map.json`**: ✅ PASS (0 issues)
- **`a8a-u8-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u8-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u8-vocab-guide.json` | 1. Vocab Guide Extraction (VGE) | `face-to-face` | IPA Format | IPA '' is not enclosed in forward slashes /.../. | Pending |
| `a8a-u8-vocab-master.json` | 2. Vocab Master (VM) | `q3a2b3c4` | Distractor PoS Mismatch | Question q3a2b3c4 (drop sb a line [phrase]): distractor 'line' has mismatching PoS [noun]. | Pending |
| `a8a-u8-vocab-master.json` | 2. Vocab Master (VM) | `q4a2b3ca` | Distractor PoS Mismatch | Question q4a2b3ca (argue with sb [phrase]): distractor 'argue' has mismatching PoS [verb]. | Pending |
| `a8a-u8-vocab-master.json` | 2. Vocab Master (VM) | `q6a2b3c9` | Distractor PoS Mismatch | Question q6a2b3c9 (sentence [verb]): distractor 'speech' has mismatching PoS [noun]. | Pending |
| `a8a-u8-vocab-master.json` | 2. Vocab Master (VM) | `q7a2b3c7` | Distractor PoS Mismatch | Question q7a2b3c7 (benefit ... from... [phrase]): distractor 'benefit' has mismatching PoS [verb]. | Pending |
| `a8a-u8-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c1_sub2` | Flat Tree Structure | Node 'c1_sub2' has 9 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u8-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c2_sub2` | Flat Tree Structure | Node 'c2_sub2' has 9 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u8-text-navigator.json` | 6. Text Navigator (TN) | `Section A Activity 2a:j_p_part3` | Flat Tree Structure | Node 'j_p_part3' has 7 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u8-text-navigator.json` | 6. Text Navigator (TN) | `Section B Activity 1b:b1_tips` | Flat Tree Structure | Node 'b1_tips' has 13 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u8-text-navigator.json` | 6. Text Navigator (TN) | `Reading Plus:rp_part1` | Flat Tree Structure | Node 'rp_part1' has 7 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u8-text-navigator.json` | 6. Text Navigator (TN) | `Reading Plus:rp_part2` | Flat Tree Structure | Node 'rp_part2' has 9 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
