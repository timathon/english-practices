# Audit Report: Practice JSONs for `v2-data/A7A/a7a-u3`

**Target Directory:** `v2-data/A7A/a7a-u3`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 17

---

## Summary by File

- **`a7a-u3-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a7a-u3-vocab-master.json`**: ⚠️ 9 issue(s)
- **`a7a-u3-spelling-hero.json`**: ✅ PASS (0 issues)
- **`a7a-u3-sentence-architect.json`**: ✅ PASS (0 issues)
- **`a7a-u3-recall-map.json`**: ✅ PASS (0 issues)
- **`a7a-u3-text-navigator.json`**: ⚠️ 5 issue(s)
- **`a7a-u3-writing-map-nlb.json`**: ⚠️ 3 issue(s)
- **`a7a-u3-writing-map.json`**: ✅ PASS (0 issues)
- **`a7a-u3-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a7a-u3-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q10b1c2d` | Distractor PoS Mismatch | Question q10b1c2d (sports field [phrase]): distractor 'field' has mismatching PoS [noun]. | Question q10b1c2d (sports field [phrase]): distractor 'hall' has mismatching PoS [noun]. | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q43w7x8y` | Distractor PoS Mismatch | Question q43w7x8y (student centre [phrase]): distractor 'centre' has mismatching PoS [noun]. | Question q43w7x8y (student centre [phrase]): distractor 'building' has mismatching PoS [noun]. | Question q43w7x8y (student centre [phrase]): distractor 'hall' has mismatching PoS [noun]. | Question q43w7x8y (student centre [phrase]): distractor 'office' has mismatching PoS [noun]. | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q52x5y6z` | Distractor PoS Mismatch | Question q52x5y6z (blackboard [other]): distractor 'whiteboard' has mismatching PoS [noun]. | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q58p7q8r` | Distractor PoS Mismatch | Question q58p7q8r (across from [phrase]): distractor 'across' has mismatching PoS [adj]. | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q67q5r6s` | Distractor PoS Mismatch | Question q67q5r6s (whiteboard [noun]): distractor 'blackboard' has mismatching PoS [other]. | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q02d4e5f` | LLM: Cn2En Distractor Language | For a 'Cn2En' question type, all distractors must be English terms, but this type is Cn2En where prompt is Chinese. Wait, checking Cn2En option language rule: The prompt says 'For type "En2Cn", all options MUST be Chinese translations.' Question q02d4e5f is of type 'Cn2En', where options are English, which is correct for Cn2En. Let's check other Cn2En questions like q08v7w8x: options are ['gym', 'jam', ...].<br>**Suggested Options:** ['dining hall', 'drawing hall', 'dancing hall', 'driving hall', 'diving hall', 'dining room'] | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q08v7w8x` | LLM: Low Quality Distractor | Distractors like 'jam', 'gum', 'gem', 'gam', 'jum' are nonsensical phonetic gibberish or slang rather than plausible English distractors for a primary/middle school level vocabulary test.<br>**Suggested Options:** ['gym', 'game', 'yard', 'gate', 'gum', 'gem'] | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q16t3u4v` | LLM: Missing Hint in Ambiguous Cloze | Even though a prompt hint is provided, it is placed at the very beginning of the prompt string instead of appended properly in standard format, or let's check if the context alone is ambiguous without the Chinese hint. The prompt contains '(提示: 张贴;搭建) Yes, we ____ up important notices there.' The hint is already included, so this is fine.<br>**Suggested Prompt:** `Yes, we ____ up important notices there. (提示: 张贴;搭建)` | Pending |
| `a7a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q73i7j8k` | LLM: Missing Hint in Ambiguous Cloze | The prompt 'Oh, and there's another blackboard ____ the back of the classroom.' lacks a Chinese hint, while prepositions like 'at', 'in', and 'on' can potentially fit fixed phrase structures depending on context, making the target blank ambiguous without a prompt.<br>**Suggested Prompt:** `Oh, and there's another blackboard ____ the back of the classroom. (提示: 在...后面)` | Pending |
| `a7a-u3-text-navigator.json` | 6. Text Navigator (TN) | `Section A Activity 2a:p_room_sub2` | Flat Tree Structure | Node 'p_room_sub2' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u3-text-navigator.json` | 6. Text Navigator (TN) | `Section B Activity 1b:email_dining` | Flat Tree Structure | Node 'email_dining' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u3-text-navigator.json` | 6. Text Navigator (TN) | `Reading Plus:rp_intro` | Flat Tree Structure | Node 'rp_intro' has 7 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u3-text-navigator.json` | 6. Text Navigator (TN) | `Reading Plus:rp_boat_features` | Flat Tree Structure | Node 'rp_boat_features' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u3-text-navigator.json` | 6. Text Navigator (TN) | `Reading Plus:rp_facilities_routine` | Flat Tree Structure | Node 'rp_facilities_routine' has 8 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u3-writing-map-nlb.json` | 7. Model Writing Map (MWM) | `Model Essay Basic:b_p1` | Flat Tree Structure | Node 'b_p1' has 6 direct leaf children without logical thematic sub-headings or grouping nodes (Level 1/2). | Pending |
| `a7a-u3-writing-map-nlb.json` | 7. Model Writing Map (MWM) | `word_count:actual:basic` | Word Count Sum Mismatch | Declared actual basic word count (86) does not match sum of leaf node word_count fields (93). | Pending |
| `a7a-u3-writing-map-nlb.json` | 7. Model Writing Map (MWM) | `word_count:actual:advanced` | Word Count Sum Mismatch | Declared actual advanced word count (115) does not match sum of leaf node word_count fields (135). | Pending |
