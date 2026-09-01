# Audit Report: Practice JSONs for `v2-data/A6A/a6a-u1`

**Target Directory:** `v2-data/A6A/a6a-u1`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 7

---

## Summary by File

- **`a6a-u1-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a6a-u1-vocab-master.json`**: ⚠️ 2 issue(s), 1 fixed, 1 pending
- **`a6a-u1-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a6a-u1-sentence-architect.json`**: ⚠️ 5 issue(s), 5 fixed, 0 pending
- **`a6a-u1-recall-map.json`**: ✅ PASS (0 issues)
- **`a6a-u1-text-navigator.json`**: ✅ PASS (0 issues)
- **`a6a-u1-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a6a-u1-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a6a-u1-vocab-master.json` | 2. Vocab Master (VM) | `Vocabulary Coverage` | Missing Item Coverage | The following 1 non-proper vocabulary items were not tested in VM: ['right thing'] | Pending |
| `a6a-u1-vocab-master.json` | 2. Vocab Master (VM) | `vm1q0029` | LLM: Missing Hint in Ambiguous Cloze | Cloze question prompt is ambiguous because multiple options fit grammatically and semantically, but lacks Chinese hint (提示: ...)<br>**Suggested Prompt:** `She ______ gold, too! (提示: 变成；转变成)` | Done |
| `a6a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `sa1s0026` | LLM: Low Quality Noise | The distractor 'some time' consists of two words, whereas noise options should be single words matching vocabulary building patterns.<br>**Suggested Noise:** ['sometimes', 'saves', 'day'] | Done |
| `a6a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `sa1s0033` | LLM: Low Quality Noise | The distractor 'oldly' is an unnatural and non-standard adverb, making it a poor grammatical trap.<br>**Suggested Noise:** ['meet', 'one', 'elder'] | Done |
| `a6a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `sa1s0035` | LLM: Low Quality Noise | The distractor 'truly' is an adverb rather than a base adjective/verb form that fits naturally as a morphological distractor for the infinitive phrase.<br>**Suggested Noise:** ['to', 'comes', 'real'] | Done |
| `a6a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `sa1s0042` | LLM: Low Quality Noise | The distractor 'turned-to' contains a hyphen and multiple words, which violates single-word distractor conventions.<br>**Suggested Noise:** ['too', 'turn', 'gold'] | Done |
| `a6a-u1-sentence-architect.json` | 4. Sentence Architect (SA) | `sa1s0049` | LLM: Low Quality Noise | The distractor 'isnt' is missing an apostrophe, making it a spelling error rather than a clean grammatical trap.<br>**Suggested Noise:** ['remembers', 'nothing', 'are'] | Done |
