# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u4`

**Target Directory:** `v2-data/A8A/a8a-u4`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 23

---

## Summary by File

- **`a8a-u4-vocab-guide.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a8a-u4-vocab-master.json`**: ⚠️ 13 issue(s), 11 fixed, 2 pending
- **`a8a-u4-spelling-hero.json`**: ⚠️ 1 issue(s), 1 fixed, 0 pending
- **`a8a-u4-sentence-architect.json`**: ⚠️ 8 issue(s), 5 fixed, 3 pending
- **`a8a-u4-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u4-text-navigator.json`**: ✅ PASS (0 issues)
- **`a8a-u4-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u4-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u4-vocab-guide.json` | 1. Vocab Guide Extraction (VGE) | `kg` | IPA Format | IPA 'NA' is not enclosed in forward slashes /.../. | Pending |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `Question Volume` | Volume Deficit | Generated 100 questions; expected target ~110 based on formula (67 items * 1.5). | Pending |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1002008` | Distractor PoS Mismatch | Question q1002008 (peony [noun]): distractor 'tiny' has mismatching PoS [adj]. | Pending |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1001004` | LLM: Low Quality Distractor | Option 'soldier' is a noun, whereas the target word is a present participle/adjective ('folding'), creating a severe part-of-speech mismatch that makes it a weak distractor.<br>**Suggested Options:** ['folding', 'holding', 'scolding', 'molding', 'binding', 'finding'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1001007` | LLM: Low Quality Distractor | Option 'Year' is capitalized as a distractor which looks grammatically awkward at the start of a sentence or gives away the lowercase target 'Yeah', plus phonetic and semantic divergence.<br>**Suggested Options:** ['Yeah', 'Nay', 'Yeast', 'Yarn', 'Yawn', 'Yank'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1003004` | LLM: Absurd Option | Options like 'seigh' and 'pleigh' are nonsense non-words rather than valid English phonetic or spelling traps suitable for middle schoolers.<br>**Suggested Options:** ['weigh', 'neigh', 'sleigh', 'grey', 'height', 'weight'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1004008` | LLM: Low Quality Distractor | Options like 'policy' and 'police' are semantically unrelated words with different syllable counts and word structures, failing to serve as strong phonetic/visual distractors for 'pollen'.<br>**Suggested Options:** ['pollen', 'poll', 'pole', 'pond', 'pocket', 'portal'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1006004` | LLM: Low Quality Distractor | Option 'aunts' is a homophone (or near-homophone), but 'arts', 'arms', 'acts', and 'apes' are weak semantic distractors compared to other insects or closely related short-vowel words.<br>**Suggested Options:** ['ants', 'bees', 'wasps', 'moths', 'bugs', 'flies'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1007001` | LLM: Low Quality Distractor | Distractors like 'make a role', 'give a role', and 'have a role' are unnatural collocations that English learners instantly spot as fake, rendering the question too easy.<br>**Suggested Options:** ['play a role', 'play a part', 'take a part', 'play a part in', 'take a role', 'play an action'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1007004` | LLM: Low Quality Distractor | 'clean' is a verb/adjective and makes no grammatical or semantic sense as a synonym for 'ocean' alongside nouns like 'stream' or 'river'.<br>**Suggested Options:** ['ocean', 'sea', 'stream', 'river', 'lake', 'pond'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1008001` | LLM: Low Quality Distractor | Words like 'Igloo', 'Voodoo', and 'Bantu' are semantically bizarre or culturally disjointed for a primary/middle school unit about nature/plants, making 'bamboo' stand out absurdly.<br>**Suggested Options:** ['Bamboo', 'Shampoo', 'Cuckoo', 'Willow', 'Cactus', 'Muskeg'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1009001` | LLM: Low Quality Distractor | Distractors like 'bedrooms', 'bathrooms', and 'classrooms' are completely nonsensical in a sentence about things appearing in a garden after the rain.<br>**Suggested Options:** ['mushrooms', 'mosses', 'flowers', 'bushes', 'weeds', 'branches'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1009003` | LLM: Low Quality Distractor | Exact duplicate of q1007004 featuring the same problematic distractor 'clean'.<br>**Suggested Options:** ['ocean', 'sea', 'stream', 'river', 'lake', 'pond'] | Done |
| `a8a-u4-vocab-master.json` | 2. Vocab Master (VM) | `q1010008` | LLM: Low Quality Distractor | The prompt asks to 'Add the endings to form nouns', but all options (happiness, sadness, business, etc.) are already fully formed nouns rather than broken roots or different suffixes.<br>**Suggested Options:** ['happiness', 'happyment', 'happyity', 'happyness', 'happyance', 'happyage'] | Done |
| `a8a-u4-spelling-hero.json` | 3. Spelling Hero (SH) | `yeah_chunk_0` | Duplicate Options | Chunk options contain duplicates: ['y', 'x', 'y'] | Done |
| `a8a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `ye9o2m71` | Noise Word Overlap | Noise word(s) 'useful' present in primary English sentence 'Also, it is one of the most useful plants in the world.'.<br>**Suggested Noise:** ['use', 'more', 'useless', 'usefully'] | Done |
| `a8a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `vslwf90k` | Noise Word Overlap | Noise word(s) 'tree' present in primary English sentence 'The ginkgo tree is one of the oldest living trees on earth.'. | Pending |
| `a8a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `zd1at7o7` | Noise Word Overlap | Noise word(s) 'arctic' present in primary English sentence 'Blue whales live in all oceans except the Arctic Ocean.'. | Pending |
| `a8a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `0votqtxh` | Noise Word Overlap | Noise word(s) 'did' present in primary English sentence 'They were over 330 kilometres from the closest land, so he did not know where to go.'. | Pending |
| `a8a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `1rsrla8s` | LLM: Noise Word Overlap | The distractor 'subject' appears verbatim in the primary English sentence 'en' ('subjects').<br>**Suggested Noise:** ['subjects'', 'more', 'popularly', 'painting'] | Done |
| `a8a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `9382kkzm` | LLM: Noise Word Overlap | The distractor 'honeycomb' appears verbatim in the sentence 'en' as part of 'honeycombs' (root word overlap). While plural/singular variations are generally acceptable, exact matching of the singular base word when the plural is present is sometimes flagged, but looking closer at the rules: inflections, singular/plural variations, or tense variations are HIGHLY DESIRABLE GRAMMAR TRAPS. Wait, 'honeycomb' vs 'honeycombs' is a singular/plural variation, which is allowed. Let's check other items.<br>**Suggested Noise:** ['for', 'stores', 'creation', 'honeycombs'] | Done |
| `a8a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `3sdygfli` | LLM: Low Quality Noise | The noise item 'food-food' is a malformed duplicate string and does not represent a high-quality grammatical or semantic trap.<br>**Suggested Noise:** ['using', 'bamboo-basket', 'stores', 'meals'] | Done |
| `a8a-u4-sentence-architect.json` | 4. Sentence Architect (SA) | `huds3qsq` | LLM: Noise Word Overlap | The noise word 'in' appears verbatim in the English sentence ('into the air' contains 'in').<br>**Suggested Noise:** ['throws', 'into', 'airtime', 'captain's'] | Done |
