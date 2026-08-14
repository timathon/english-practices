# Audit Report: Practice JSONs for `v2-data/A7A/a7a-u2`

**Target Directory:** `v2-data/A7A/a7a-u2`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 10

---

## Summary by File

- **`a7a-u2-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a7a-u2-vocab-master.json`**: ⚠️ 7 issue(s), 7 fixed, 0 pending
- **`a7a-u2-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a7a-u2-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a7a-u2-recall-map.json`**: ✅ PASS (0 issues)
- **`a7a-u2-text-navigator.json`**: ⚠️ 3 issue(s), 0 fixed, 3 pending
- **`a7a-u2-writing-map.json`**: ✅ PASS (0 issues)
- **`a7a-u2-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a7a-u2-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a7a-u2-vocab-master.json` | 2. Vocab Master (VM) | `q1001a1b` | LLM: Duplicate Options | The options array contains duplicate choices ('grandparents' appears twice).<br>**Suggested Options:** ['grandparents', 'parents', 'uncles', 'cousins', 'children', 'aunts'] | Done |
| `a7a-u2-vocab-master.json` | 2. Vocab Master (VM) | `q1010s0t` | LLM: Duplicate Options | The options array contains multiple duplicate choices ('spends' appears 5 times).<br>**Suggested Options:** ['spends', 'sends', 'spends', 'spends', 'spends', 'spends'] | Done |
| `a7a-u2-vocab-master.json` | 2. Vocab Master (VM) | `q2004g4h` | LLM: Duplicate Options | The options array contains duplicate choices ('actor' appears twice).<br>**Suggested Options:** ['activity', 'active', 'actor', 'actress', 'action', 'actor'] | Done |
| `a7a-u2-vocab-master.json` | 2. Vocab Master (VM) | `q5002c2d` | LLM: Duplicate Options | The options array contains multiple duplicate choices ('spend' appears 4 times).<br>**Suggested Options:** ['spend', 'send', 'spend', 'spend', 'spend', 'spend'] | Done |
| `a7a-u2-vocab-master.json` | 2. Vocab Master (VM) | `q5004g4h` | LLM: Duplicate Options | The options array contains duplicate choices ('hiking' appears 6 times).<br>**Suggested Options:** ['hiking', 'hiking', 'hiking', 'hiking', 'hiking', 'hiking'] | Done |
| `a7a-u2-vocab-master.json` | 2. Vocab Master (VM) | `q5006k6l` | LLM: Duplicate Options | The options array contains duplicate choices ('花费' appears 3 times).<br>**Suggested Options:** ['花(时间、钱等)', '发送', '站立', '花费', '支付', '消耗'] | Done |
| `a7a-u2-vocab-master.json` | 2. Vocab Master (VM) | `q6007m7n` | LLM: Duplicate Options | The options array contains duplicate choices ('许多' and '大量' are repeated).<br>**Suggested Options:** ['大量;许多', '一点', '一些', '许多', '少许', '几个'] | Done |
| `a7a-u2-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c2_sub1` | Flat Tree Structure | Node 'c2_sub1' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u2-text-navigator.json` | 6. Text Navigator (TN) | `Section A, 1b and 1c:c2_sub2` | Flat Tree Structure | Node 'c2_sub2' has 7 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u2-text-navigator.json` | 6. Text Navigator (TN) | `Reading Plus:rp_sub1` | Flat Tree Structure | Node 'rp_sub1' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
