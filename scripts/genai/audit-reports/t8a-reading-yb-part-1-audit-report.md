# Audit Report: Practice JSONs for `v2-data/T8A/t8a-reading-yb-part-1`

**Target Directory:** `v2-data/T8A/t8a-reading-yb-part-1`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 35

---

## Summary by File

- **`t8a-reading-yb-part-1-vocab-guide-test-4.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-guide-test-1.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-guide-test-3.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-guide-test-2.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-guide-test-5.json`**: ⚠️ 1 issue(s)
- **`t8a-reading-yb-part-1-vocab-master-test-4.json`**: ⚠️ 33 issue(s)
- **`t8a-reading-yb-part-1-vocab-master-test-3.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-master-test-1.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-master-test-5.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-vocab-master-test-2.json`**: ⚠️ 1 issue(s)
- **`t8a-reading-yb-part-1-passage-decoder-w-test-3.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-passage-decoder-w-test-2.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-passage-decoder-w-test-4.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-passage-decoder-w-test-5.json`**: ✅ PASS (0 issues)
- **`t8a-reading-yb-part-1-passage-decoder-w-test-1.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `t8a-reading-yb-part-1-vocab-guide-test-5.json` | 1. Vocab Guide Extraction (VGE) | `provide...with...` | IPA Format | IPA '' is not enclosed in forward slashes /.../. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01001` | ID Format | Question ID 'q01001' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01001` | Distractor PoS Mismatch | Question q01001 (be sure to do sth. [phrase]): distractor 'organize' has mismatching PoS [verb]. | Question q01001 (be sure to do sth. [phrase]): distractor 'perform' has mismatching PoS [verb]. | Question q01001 (be sure to do sth. [phrase]): distractor 'act' has mismatching PoS [verb]. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01002` | ID Format | Question ID 'q01002' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01003` | ID Format | Question ID 'q01003' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01004` | ID Format | Question ID 'q01004' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01005` | ID Format | Question ID 'q01005' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01006` | ID Format | Question ID 'q01006' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01007` | ID Format | Question ID 'q01007' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01008` | ID Format | Question ID 'q01008' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01009` | ID Format | Question ID 'q01009' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01010` | ID Format | Question ID 'q01010' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q01010` | Distractor PoS Mismatch | Question q01010 (fill out [phrase]): distractor 'organize' has mismatching PoS [verb]. | Question q01010 (fill out [phrase]): distractor 'perform' has mismatching PoS [verb]. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02001` | ID Format | Question ID 'q02001' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02002` | ID Format | Question ID 'q02002' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02003` | ID Format | Question ID 'q02003' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02004` | ID Format | Question ID 'q02004' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02005` | ID Format | Question ID 'q02005' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02006` | ID Format | Question ID 'q02006' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02007` | ID Format | Question ID 'q02007' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02008` | ID Format | Question ID 'q02008' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02009` | ID Format | Question ID 'q02009' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02009` | Distractor PoS Mismatch | Question q02009 (perform [verb]): distractor 'literature' has mismatching PoS [noun]. | Question q02009 (perform [verb]): distractor 'journey' has mismatching PoS [noun]. | Question q02009 (perform [verb]): distractor 'pressure' has mismatching PoS [noun]. | Question q02009 (perform [verb]): distractor 'position' has mismatching PoS [noun]. | Question q02009 (perform [verb]): distractor 'interview' has mismatching PoS [noun]. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q02010` | ID Format | Question ID 'q02010' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03001` | ID Format | Question ID 'q03001' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03002` | ID Format | Question ID 'q03002' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03003` | ID Format | Question ID 'q03003' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03004` | ID Format | Question ID 'q03004' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03005` | ID Format | Question ID 'q03005' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03006` | ID Format | Question ID 'q03006' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03007` | ID Format | Question ID 'q03007' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03008` | ID Format | Question ID 'q03008' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03009` | ID Format | Question ID 'q03009' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-4.json` | 2. Vocab Master (VM) | `q03010` | ID Format | Question ID 'q03010' is not an 8-character alphanumeric string. | Pending |
| `t8a-reading-yb-part-1-vocab-master-test-2.json` | 2. Vocab Master (VM) | `qf4bpo17` | LLM: Duplicate Options | The options array contains 'department' twice as a duplicate choice.<br>**Suggested Options:** ['building', 'department', 'basement', 'apartment', 'flat', 'house'] | Pending |
