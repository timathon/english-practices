# Audit Report: Practice JSONs for `v2-data/A7A/a7a-u7`

**Target Directory:** `v2-data/A7A/a7a-u7`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 5

---

## Summary by File

- **`a7a-u7-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a7a-u7-vocab-master.json`**: ⚠️ 1 issue(s)
- **`a7a-u7-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a7a-u7-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a7a-u7-recall-map.json`**: ✅ PASS (0 issues)
- **`a7a-u7-text-navigator.json`**: ⚠️ 4 issue(s)
- **`a7a-u7-writing-map.json`**: ✅ PASS (0 issues)
- **`a7a-u7-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a7a-u7-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a7a-u7-vocab-master.json` | 2. Vocab Master (VM) | `l5m6n7o8` | Distractor PoS Mismatch | Question l5m6n7o8 (blow out [phrase]): distractor 'blow' has mismatching PoS [verb]. | Question l5m6n7o8 (blow out [phrase]): distractor 'grow' has mismatching PoS [verb]. | Pending |
| `a7a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c1_sub1` | Flat Tree Structure | Node 'c1_sub1' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c1_sub2` | Flat Tree Structure | Node 'c1_sub2' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section A Activity 2a:shop_sub1` | Flat Tree Structure | Node 'shop_sub1' has 7 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section B Activity 1b:p2_sub1` | Flat Tree Structure | Node 'p2_sub1' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
