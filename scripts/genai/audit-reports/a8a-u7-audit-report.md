# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u7`

**Target Directory:** `v2-data/A8A/a8a-u7`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 5

---

## Summary by File

- **`a8a-u7-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a8a-u7-vocab-master.json`**: ⚠️ 1 issue(s)
- **`a8a-u7-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a8a-u7-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a8a-u7-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u7-text-navigator.json`**: ⚠️ 4 issue(s)
- **`a8a-u7-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u7-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u7-vocab-master.json` | 2. Vocab Master (VM) | `q0040010` | Distractor PoS Mismatch | Question q0040010 (pilot [noun]): distractor 'public' has mismatching PoS [adj]. | Pending |
| `a8a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:s1b_booking` | Flat Tree Structure | Node 's1b_booking' has 7 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:s1c_environmental_optimism` | Flat Tree Structure | Node 's1c_environmental_optimism' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section A Activity 2a:p2a_health_tech` | Flat Tree Structure | Node 'p2a_health_tech' has 8 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a8a-u7-text-navigator.json` | 6. Text Navigator (TN) | `Section B Activity 1b:r_robotics_tech` | Flat Tree Structure | Node 'r_robotics_tech' has 8 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
