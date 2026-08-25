# Audit Report: Practice JSONs for `v2-data/A7A/a7a-u4`

**Target Directory:** `v2-data/A7A/a7a-u4`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 9

---

## Summary by File

- **`a7a-u4-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a7a-u4-vocab-master.json`**: ⚠️ 6 issue(s)
- **`a7a-u4-spelling-hero.json`**: ⚠️ 3 issue(s)
- **`a7a-u4-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a7a-u4-recall-map.json`**: ✅ PASS (0 issues)
- **`a7a-u4-text-navigator-a2a.json`**: ✅ PASS (0 issues)
- **`a7a-u4-text-navigator-b1b.json`**: ✅ PASS (0 issues)
- **`a7a-u4-writing-map.json`**: ✅ PASS (0 issues)
- **`a7a-u4-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a7a-u4-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `r9i0j1k2` | Distractor PoS Mismatch | Question r9i0j1k2 (French [adj]): distractor 'biology' has mismatching PoS [noun]. | Question r9i0j1k2 (French [adj]): distractor 'geography' has mismatching PoS [noun]. | Question r9i0j1k2 (French [adj]): distractor 'history' has mismatching PoS [noun]. | Pending |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `s9i0j1k2` | Distractor PoS Mismatch | Question s9i0j1k2 (magic [adj]): distractor 'subject' has mismatching PoS [noun]. | Question s9i0j1k2 (magic [adj]): distractor 'history' has mismatching PoS [noun]. | Question s9i0j1k2 (magic [adj]): distractor 'problem' has mismatching PoS [noun]. | Pending |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `u1a2b3c4` | Distractor PoS Mismatch | Question u1a2b3c4 (remember [verb]): distractor 'listen to' has mismatching PoS [phrase]. | Question u1a2b3c4 (remember [verb]): distractor 'work out' has mismatching PoS [phrase]. | Pending |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `u4d5e6f7` | Distractor PoS Mismatch | Question u4d5e6f7 (work out [phrase]): distractor 'remember' has mismatching PoS [verb]. | Pending |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `u5e6f7g8` | Distractor PoS Mismatch | Question u5e6f7g8 (remember [verb]): distractor 'listen to' has mismatching PoS [phrase]. | Question u5e6f7g8 (remember [verb]): distractor 'work out' has mismatching PoS [phrase]. | Pending |
| `a7a-u4-vocab-master.json` | 2. Vocab Master (VM) | `u8h9i0j1` | Distractor PoS Mismatch | Question u8h9i0j1 (work out [phrase]): distractor 'remember' has mismatching PoS [verb]. | Pending |
| `a7a-u4-spelling-hero.json` | 3. Spelling Hero (SH) | `Coverage` | Missing Single Words | Single-word vocabulary items missing from Spelling Hero: {'PM', 'IT', 'AM'} | Pending |
| `a7a-u4-spelling-hero.json` | 3. Spelling Hero (SH) | `future_chunk_1` | Duplicate Options | Chunk options contain duplicates: ['ture', 'turex', 'turex'] | Pending |
| `a7a-u4-spelling-hero.json` | 3. Spelling Hero (SH) | `magic_chunk_1` | Duplicate Options | Chunk options contain duplicates: ['gic', 'gicx', 'gicx'] | Pending |
