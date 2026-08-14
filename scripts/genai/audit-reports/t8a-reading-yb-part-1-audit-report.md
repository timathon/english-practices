# Audit Report: Practice JSONs for `v2-data/T8A/t8a-reading-yb-part-1`

**Target Directory:** `v2-data/T8A/t8a-reading-yb-part-1`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 36

---

## Summary by File

- **`t8a-reading-yb-part-1-vocab-guide-test-4.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-guide-test-1.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-guide-test-3.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-guide-test-2.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-master-test-4.json`**: ⚠️ 34 issue(s), 0 fixed, 34 pending
- **`t8a-reading-yb-part-1-vocab-master-test-3.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-master-test-1.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-master-test-2.json`**: ⚠️ 2 issue(s), 2 fixed, 0 pending
- **`t8a-reading-yb-part-1-passage-decoder-w-test-3.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-passage-decoder-w-test-2.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-passage-decoder-w-test-4.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-passage-decoder-w-test-1.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `woe42let` | Distractor PoS Mismatch | Question woe42let (general [adj]): distractor 'act' has mismatching PoS [verb]. | Question woe42let (general [adj]): distractor 'organize' has mismatching PoS [verb]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `fnjlndl0` | Distractor PoS Mismatch | Question fnjlndl0 (act [verb]): distractor 'come up with' has mismatching PoS [phrase]. | Question fnjlndl0 (act [verb]): distractor 'literature' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `2bik11tx` | Distractor PoS Mismatch | Question 2bik11tx (position [noun]): distractor 'perform' has mismatching PoS [verb]. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `1h7lcebk` | Distractor PoS Mismatch | Question 1h7lcebk (literature [noun]): distractor 'general' has mismatching PoS [adj]. | Question 1h7lcebk (literature [noun]): distractor 'act' has mismatching PoS [verb]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `2eqyyhyl` | Distractor PoS Mismatch | Question 2eqyyhyl (limit [noun]): distractor 'meaningful' has mismatching PoS [adj]. | Question 2eqyyhyl (limit [noun]): distractor 'be sure to do sth.' has mismatching PoS [phrase]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `th8tq10r` | Distractor PoS Mismatch | Question th8tq10r (general [adj]): distractor 'act' has mismatching PoS [verb]. | Question th8tq10r (general [adj]): distractor 'literature' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `my2samnq` | Distractor PoS Mismatch | Question my2samnq (interview [noun]): distractor 'organize' has mismatching PoS [verb]. | Question my2samnq (interview [noun]): distractor 'be sure to do sth.' has mismatching PoS [phrase]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `jtveh0kl` | Distractor PoS Mismatch | Question jtveh0kl (perform [verb]): distractor 'interview' has mismatching PoS [noun]. | Question jtveh0kl (perform [verb]): distractor 'come up with' has mismatching PoS [phrase]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `7qvqtzwb` | Distractor PoS Mismatch | Question 7qvqtzwb (form [noun]): distractor 'come up with' has mismatching PoS [phrase]. | Question 7qvqtzwb (form [noun]): distractor 'behavioral' has mismatching PoS [adj]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `rmji2o6i` | Distractor PoS Mismatch | Question rmji2o6i (interview [noun]): distractor 'be sure to do sth.' has mismatching PoS [phrase]. | Question rmji2o6i (interview [noun]): distractor 'perform' has mismatching PoS [verb]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `scy144v1` | Distractor PoS Mismatch | Question scy144v1 (meaningful [adj]): distractor 'literature' has mismatching PoS [noun]. | Question scy144v1 (meaningful [adj]): distractor 'position' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `1i6g6mcr` | Distractor PoS Mismatch | Question 1i6g6mcr (position [noun]): distractor 'organize' has mismatching PoS [verb]. | Question 1i6g6mcr (position [noun]): distractor 'fill out' has mismatching PoS [phrase]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `mipq7io3` | Distractor PoS Mismatch | Question mipq7io3 (be sure to do sth. [phrase]): distractor 'literature' has mismatching PoS [noun]. | Question mipq7io3 (be sure to do sth. [phrase]): distractor 'limit' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `zlc4t9x4` | Distractor PoS Mismatch | Question zlc4t9x4 (act [verb]): distractor 'pressure' has mismatching PoS [noun]. | Question zlc4t9x4 (act [verb]): distractor 'general' has mismatching PoS [adj]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `cfe5ytjp` | Distractor PoS Mismatch | Question cfe5ytjp (limit [noun]): distractor 'general' has mismatching PoS [adj]. | Question cfe5ytjp (limit [noun]): distractor 'meaningful' has mismatching PoS [adj]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `w7nnk4c4` | Distractor PoS Mismatch | Question w7nnk4c4 (organize [verb]): distractor 'pressure' has mismatching PoS [noun]. | Question w7nnk4c4 (organize [verb]): distractor 'literature' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `3kla4jjd` | Distractor PoS Mismatch | Question 3kla4jjd (fill out [phrase]): distractor 'general' has mismatching PoS [adj]. | Question 3kla4jjd (fill out [phrase]): distractor 'interview' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `adhi4itb` | Distractor PoS Mismatch | Question adhi4itb (pressure [noun]): distractor 'general' has mismatching PoS [adj]. | Question adhi4itb (pressure [noun]): distractor 'act' has mismatching PoS [verb]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `l2h1ys39` | Distractor PoS Mismatch | Question l2h1ys39 (come up with [phrase]): distractor 'organize' has mismatching PoS [verb]. | Question l2h1ys39 (come up with [phrase]): distractor 'form' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `wabmecvq` | Distractor PoS Mismatch | Question wabmecvq (perform [verb]): distractor 'be sure to do sth.' has mismatching PoS [phrase]. | Question wabmecvq (perform [verb]): distractor 'journey' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `zio3hfzk` | Distractor PoS Mismatch | Question zio3hfzk (literature [noun]): distractor 'behavioral' has mismatching PoS [adj]. | Question zio3hfzk (literature [noun]): distractor 'meaningful' has mismatching PoS [adj]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `cnp42qjf` | Distractor PoS Mismatch | Question cnp42qjf (form [noun]): distractor 'organize' has mismatching PoS [verb]. | Question cnp42qjf (form [noun]): distractor 'come up with' has mismatching PoS [phrase]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `m1r4bkik` | Distractor PoS Mismatch | Question m1r4bkik (behavioral [adj]): distractor 'interview' has mismatching PoS [noun]. | Question m1r4bkik (behavioral [adj]): distractor 'journey' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `09uysvr7` | Distractor PoS Mismatch | Question 09uysvr7 (form [noun]): distractor 'fill out' has mismatching PoS [phrase]. | Question 09uysvr7 (form [noun]): distractor 'meaningful' has mismatching PoS [adj]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `wuxk1iuf` | Distractor PoS Mismatch | Question wuxk1iuf (organize [verb]): distractor 'literature' has mismatching PoS [noun]. | Question wuxk1iuf (organize [verb]): distractor 'form' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `efobmr51` | Distractor PoS Mismatch | Question efobmr51 (journey [noun]): distractor 'be sure to do sth.' has mismatching PoS [phrase]. | Question efobmr51 (journey [noun]): distractor 'behavioral' has mismatching PoS [adj]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `t3b05px1` | Distractor PoS Mismatch | Question t3b05px1 (meaningful [adj]): distractor 'come up with' has mismatching PoS [phrase]. | Question t3b05px1 (meaningful [adj]): distractor 'be sure to do sth.' has mismatching PoS [phrase]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `7p7d7mep` | Distractor PoS Mismatch | Question 7p7d7mep (come up with [phrase]): distractor 'position' has mismatching PoS [noun]. | Question 7p7d7mep (come up with [phrase]): distractor 'journey' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `0524yftm` | Distractor PoS Mismatch | Question 0524yftm (be sure to do sth. [phrase]): distractor 'pressure' has mismatching PoS [noun]. | Question 0524yftm (be sure to do sth. [phrase]): distractor 'limit' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `x9af9x99` | Distractor PoS Mismatch | Question x9af9x99 (be sure to do sth. [phrase]): distractor 'limit' has mismatching PoS [noun]. | Question x9af9x99 (be sure to do sth. [phrase]): distractor 'organize' has mismatching PoS [verb]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `ylmxd6kz` | Distractor PoS Mismatch | Question ylmxd6kz (journey [noun]): distractor 'general' has mismatching PoS [adj]. | Question ylmxd6kz (journey [noun]): distractor 'act' has mismatching PoS [verb]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `47pk8t8u` | Distractor PoS Mismatch | Question 47pk8t8u (behavioral [adj]): distractor 'pressure' has mismatching PoS [noun]. | Question 47pk8t8u (behavioral [adj]): distractor 'journey' has mismatching PoS [noun]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `9r4ax59y` | Distractor PoS Mismatch | Question 9r4ax59y (fill out [phrase]): distractor 'interview' has mismatching PoS [noun]. | Question 9r4ax59y (fill out [phrase]): distractor 'general' has mismatching PoS [adj]. |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `co7z1u6n` | Distractor PoS Mismatch | Question co7z1u6n (pressure [noun]): distractor 'organize' has mismatching PoS [verb]. | Question co7z1u6n (pressure [noun]): distractor 'fill out' has mismatching PoS [phrase]. |
| `t8a-reading-yb-part-1-vocab-master-test-2.json` | 2. Vocab Master (VM) | `rlhoaccc` | LLM: Duplicate Options | The options array contains a duplicate choice ('department').<br>**Suggested Options:** ['department', 'basement', 'building', 'apartment', 'flat', 'house'] | Done |
| `t8a-reading-yb-part-1-vocab-master-test-2.json` | 2. Vocab Master (VM) | `pdlqcgk2` | LLM: Duplicate Options | The options array contains a duplicate choice ('department').<br>**Suggested Options:** ['department', 'house', 'apartment', 'building', 'flat', 'basement'] | Done |
