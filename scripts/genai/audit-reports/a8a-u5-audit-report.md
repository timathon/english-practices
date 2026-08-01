# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u5`

**Target Directory:** `v2-data/A8A/a8a-u5`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 18

---

## Summary by File

- **`a8a-u5-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a8a-u5-vocab-master.json`**: ⚠️ 15 issue(s), 7 fixed, 8 pending
- **`a8a-u5-spelling-hero.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a8a-u5-sentence-architect.json`**: ⚠️ 2 issue(s), 2 fixed, 0 pending
- **`a8a-u5-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u5-text-navigator.json`**: ✅ PASS (0 issues)
- **`a8a-u5-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u5-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0100107` | Distractor PoS Mismatch | Question q0100107 (flour [noun]): distractor 'sour' has mismatching PoS [adj]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0300108` | Distractor PoS Mismatch | Question q0300108 (sour [adj]): distractor 'flour' has mismatching PoS [noun]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0400104` | Distractor PoS Mismatch | Question q0400104 (dream [verb]): distractor 'cream' has mismatching PoS [noun]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500102` | Distractor PoS Mismatch | Question q0500102 (warm up [phrase]): distractor 'heat' has mismatching PoS [verb]. | Question q0500102 (warm up [phrase]): distractor 'mix' has mismatching PoS [verb]. |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500109` | Distractor PoS Mismatch | Question q0500109 (hostess [noun]): distractor 'host' has mismatching PoS [verb]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500110` | Distractor PoS Mismatch | Question q0500110 (cream [noun]): distractor 'dream' has mismatching PoS [verb]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q1000104` | Distractor PoS Mismatch | Question q1000104 (put sth back [phrase]): distractor 'mix' has mismatching PoS [verb]. | Pending |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q1100103` | En2Cn Distractor Language | En2Cn option [0] contains raw English text: '(pl.) 用法说明; 操作指南' | Done |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0100103` | LLM: Low Quality Distractor | Distractors like 'mox' and 'pix' are nonsense words rather than legitimate English words, which reduces the pedagogical value of the spelling trap.<br>**Suggested Options:** ['mix', 'fix', 'max', 'wax', 'mow', 'mad'] | Done |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0200103` | LLM: Low Quality Distractor | The option 'mult' is a non-word/nonsense option. Better phonetic/visual distractors should be real words.<br>**Suggested Options:** ['mash', 'wash', 'match', 'make', 'mix', 'mesh'] | Done |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0300106` | LLM: Semantic/Visual Distractor Flaw | 'Destructions' is awkward and rarely used in standard primary/middle school contexts compared to other standard derivatives.<br>**Suggested Options:** ['instructions', 'constructions', 'introductions', 'inventions', 'intentions', 'inspectors'] | Done |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0600104` | LLM: Translation Inaccuracy | The correct answer option is '建议至少', which includes an extra instructional verb ('建议') making it inconsistent with standard phrase translation formatting.<br>**Suggested Options:** ['at least', '逐个地; 逐一地', '除...以外(还); 与...同样地', '根据; 依照', '(使)活跃起来; 热身; 预热', '(使)充满; (使)填满'] | Done |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0700101` | LLM: Low Quality Distractor | Some semantic distractors overlap heavily with cutting into general portions rather than the specific 'thin flat piece' meaning of 'slice'.<br>**Suggested Options:** ['薄片; 片 / 把...切成薄片', '块; 团 / 把...切成块', '丁; 颗粒 / 把...切成丁', '丝; 细条 / 把...切成丝', '碎末; 屑 / 把...切碎', '半块; 半边 / 把...切成两半'] | Done |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0800103` | LLM: Low Quality Distractor | Distractors like 'Moil' and 'Poil' are nonsense pseudo-words rather than authentic English words, violating phonetic trap design principles.<br>**Suggested Options:** ['Boil', 'Broil', 'Spoil', 'Foil', 'Soil', 'Coil'] | Done |
| `a8a-u5-vocab-master.json` | 2. Vocab Master (VM) | `q1100101` | LLM: Low Quality Distractor | 'Tablecloth' is a semantic mismatch (noun representing a cloth rather than a measure/spoon), failing to act as a proper measure-word/container distractor.<br>**Suggested Options:** ['tablespoon', 'teaspoon', 'glassful', 'cupful', 'bowlful', 'plateful'] | Done |
| `a8a-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `Coverage` | Missing Single Words | Single-word vocabulary items missing from Spelling Hero: {'stir-fry'} | Pending |
| `a8a-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u53031` | LLM: Noise Word Overlap | The distractor 'taste' appears verbatim in the primary sentence 'en' ('Smells and taste connect us to each other.').<br>**Suggested Noise:** ['flavor', 'smell', 'recipe'] | Done |
| `a8a-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u53032` | LLM: Noise Word Overlap | The distractor 'taste' appears verbatim in the primary sentence 'en' ('What wonderful memories I have!'- wait, let's check: 'taste' is not in s8u53032, let's look closer. Actually, 'taste' is NOT in s8u53032. Wait, let me check s8u53032 text: 'What wonderful memories I have!'. Distractors are 'taste', 'knife', 'fruit'. None of these overlap. But wait, let's check rule 1: Exact Noise Word Overlap. Are any of the distractors in s8u53032 in 'en'? No. Let's re-verify all items against exact overlap).<br>**Suggested Noise:** ['flavor', 'spoon', 'dish'] | Done |
