# Audit Report: Practice JSONs for `v2-data/A8A/a8a-u3`

**Target Directory:** `v2-data/A8A/a8a-u3`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 37

---

## Summary by File

- **`a8a-u3-vocab-guide.json`**: ✅ PASS (0 issues)
- **`a8a-u3-vocab-master.json`**: ⚠️ 28 issue(s), 25 fixed, 3 pending
- **`a8a-u3-spelling-hero.json`**: ⚠️ 1 issue(s), 1 fixed, 0 pending
- **`a8a-u3-sentence-architect.json`**: ⚠️ 7 issue(s), 7 fixed, 0 pending
- **`a8a-u3-recall-map.json`**: ✅ PASS (0 issues)
- **`a8a-u3-text-navigator.json`**: ⚠️ 1 issue(s), 0 fixed, 1 pending
- **`a8a-u3-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`a8a-u3-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q21a2b3c` | Duplicate Options | Question q21a2b3c contains duplicate options: ['flute', 'fruit', 'flute', 'flute', 'flute', 'flute'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q37g8h9i` | Duplicate Options | Question q37g8h9i contains duplicate options: ['pleasant', 'peasant', 'present', 'pleasant', 'pleasant', 'pleasant'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q46f7g8h` | En2Cn Distractor Language | En2Cn option [5] contains raw English text: ' Humour' | Pending |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q90j1k2l` | Duplicate Options | Question q90j1k2l contains duplicate options: ['prize', 'price', 'surprise', 'praise', 'pride', 'prize'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q1a2b3c4` | LLM: Low Quality Distractor | The distractors (sky, spy, sly, dry, fly) are purely rhyming visual traps rather than semantically or structurally appropriate antonyms or same-category vocabulary fitting the sentence context ('fast ____ late').<br>**Suggested Options:** ['shy', 'slow', 'short', 'quiet', 'early', 'hard-working'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q4d5e6f7` | LLM: Low Quality Distractor | The distractors ('ongoing', 'outgrown', 'outstanding', etc.) are purely morphological look-alikes starting with 'out-', rather than contrasting adjectives of personality that match the surrounding lexical set.<br>**Suggested Options:** ['outgoing', 'shy', 'quiet', 'serious', 'friendly', 'lazy'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q5e6f7g8` | LLM: Low Quality Distractor | Distractors like 'network', 'homework', and 'housework' are nouns, which violates part-of-speech consistency since the prompt asks for an adjective ('勤奋的').<br>**Suggested Options:** ['hard-working', 'helpful', 'honest', 'humorous', 'handsome', 'healthy'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q7g8h9i0` | LLM: Low Quality Distractor | Distractors like 'slammer' and 'swimmer' are nonsensical nouns or implausible words in this comparative adjective context.<br>**Suggested Options:** ['slimmer', 'taller', 'shorter', 'thinner', 'heavier', 'smaller'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q8h9i0j1` | LLM: Low Quality Distractor | Distractors include root-sharing words ('straight', 'forward') or non-adjective derivations ('straightened') that make the question a test of morphological puzzle-solving rather than true vocabulary mastery.<br>**Suggested Options:** ['straightforward', 'stubborn', 'strict', 'sincere', 'sensible', 'sensitive'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q9i0j1k2` | LLM: Low Quality Distractor | The distractor '森林的' (forest's) is an absurd, completely unrelated semantic non-sequitur that fails to provide a meaningful semantic trap.<br>**Suggested Options:** ['诚实的', '谦虚的', '大方的', '聪明的', '勤奋的', '幽默的'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q10j1k2l3` | LLM: Low Quality Distractor | Distractors rely heavily on look-alike sound/spelling patterns ('detect', 'defect', 'effect') rather than contextually relevant synonymous or antonymous adjectives.<br>**Suggested Options:** ['direct', 'clear', 'strong', 'personal', 'honest', 'directs'] | Pending |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q14d5e6f` | LLM: Low Quality Distractor | Distractors ('intended', 'extended', 'pretended', 'offended') are purely rhyming/orthographic '-ended' past-tense verbs, and option 'attendeds' is grammatically impossible.<br>**Suggested Options:** ['attended', 'joined', 'visited', 'enjoyed', 'watched', 'missed'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q17g8h9i` | LLM: Low Quality Distractor | Distractors are exclusively look-alike Latinate verbs ending in '-ected' or '-cepted', testing spelling recognition rather than contextual understanding.<br>**Suggested Options:** ['expected', 'thought', 'imagined', 'believed', 'knew', 'guessed'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q20j1k2l` | LLM: Low Quality Distractor | Options include a duplicate ('reach for' appears twice in the options list), making the distractor set poorly constructed.<br>**Suggested Options:** ['reaches for', 'reaches', 'reaches out', 'holds on', 'looks for', 'asks for'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q21a2b3c` | LLM: Low Quality Distractor | The options are heavily duplicated ('flute' repeated multiple times) leaving practically only one distractor ('fruit'), which is a poor testing format.<br>**Suggested Options:** ['flute', 'fruit', 'drum', 'violin', 'guitar', 'piano'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q37g8h9i` | LLM: Low Quality Distractor | The options feature multiple duplicates of 'pleasant', with only 'peasant' and 'present' as actual unique distractors.<br>**Suggested Options:** ['pleasant', 'peasant', 'present', 'pleasant', 'pleasant', 'pleasant'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q43c4d5e` | LLM: Low Quality Distractor | The distractors (恐怖, 错误, 底层, 主要, 大理石) are completely random semantic non-sequiturs with no phonetic, visual, or conceptual relationship to 'mirror'.<br>**Suggested Options:** ['镜子', '错误', '目标', '方法', '魔术', '金属'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q46f7g8h` | LLM: Low Quality Distractor | Distractor options include a capitalization duplicate (' Humour') and random meanings (谣言, 荣誉, 饥饿, 人类) that fail to test plausible English-to-Chinese confusion.<br>**Suggested Options:** ['幽默', '荣誉', '谣言', '饥饿', '人类', '习惯'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q49i0j1k` | LLM: Low Quality Distractor | The distractors lack strong semantic or morphological ties to 'similarity' (e.g. confusion with sincerity, simplicity, or familiarity would be better traps).<br>**Suggested Options:** ['相似之处', '熟悉度', '诚实', '简单性', '差异', '重要性'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q50j1k2l` | LLM: Low Quality Distractor | While the suffixes rhyme (-ship), words like leadership, membership, ownership, and partnership create an odd context in the sentence 'What can similarities bring to a friendship?', making some options semantically awkward rather than testing precise lexical differentiation.<br>**Suggested Options:** ['friendship', 'relationship', 'partnership', 'hardship', 'membership', 'leadership'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q53c4d5e` | LLM: Low Quality Distractor | The distractors (纸张, 权力, 目的, 乘客, 部分) are completely unrelated words showing no phonetic or semantic connection to 'pauper'.<br>**Suggested Options:** ['贫民;乞丐', '纸张', '权力', '目的', ' Paper'] | Pending |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q56f7g8h` | LLM: Low Quality Distractor | The Chinese translation options (独自, 沿着, 活跃, 允许, 大声, 总是) fail to test common vocabulary confusions or structural properties.<br>**Suggested Options:** ['独自', '沿着', '大声', '活跃', '总是', '寂寞'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q59i0j1k` | LLM: Low Quality Distractor | The Chinese meaning distractors (打算, 假装, 冒犯, 扩展, 注意) do not include common visually/phonetically similar Chinese verbs or close synonyms.<br>**Suggested Options:** ['参加', '打算', '假装', '注意', '尝试', '到达'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q61a2b3c` | LLM: Low Quality Distractor | Distractors like 'running alone' are semantic non-sequiturs in the context of musical performance, making them trivial to eliminate.<br>**Suggested Options:** ['performing alone', 'performing together', 'singing alone', 'acting alone', 'dancing alone', 'playing alone'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q72b3c4d` | LLM: Low Quality Distractor | 'because of' is a semantic synonym/near-synonym in many contexts, but 'thanks a lot' and 'thank you' are weak grammatical distractors that fail to test the prepositional phrase function properly.<br>**Suggested Options:** ['thanks to', 'according to', 'instead of', 'due to', 'because of', 'as for'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q74d5e6f` | LLM: Low Quality Distractor | 'at last' and 'in fact' do not fit the prepositional adverbial structure required by the sentence as neatly as intended, making 'on purpose' the only true conceptual foil.<br>**Suggested Options:** ['by accident', 'on purpose', 'by mistake', 'in time', 'by hand', 'in public'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q80j1k2l` | LLM: Low Quality Distractor | Options include duplicate forms ('reach for' appears twice) and incorrect base forms that break subject-verb agreement too obviously.<br>**Suggested Options:** ['reaches for', 'reaches out', 'reaches down', 'reaches back', 'reach for', 'is reaching'] | Done |
| `a8a-u3-vocab-master.json` | 2. Vocab Master (VM) | `q90j1k2l` | LLM: Duplicate Option | The correct answer 'prize' appears twice in the options list (index 0 and index 5).<br>**Suggested Options:** ['prize', 'price', 'surprise', 'praise', 'pride', 'promise'] | Done |
| `a8a-u3-spelling-hero.json` | 3. Spelling Hero (SH) | `congratulation_chunk_1` | Duplicate Options | Chunk options contain duplicates: ['gret', 'gret', 'grat'] | Done |
| `a8a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u3c206` | Noise Word Overlap | Noise word(s) 'than' present in primary English sentence 'And she is funnier than me.'.<br>**Suggested Noise:** ['funny', 'more', 'as', 'I'] | Done |
| `a8a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u3c209` | Noise Word Overlap | Noise word(s) 'each' present in primary English sentence 'What can you learn from each other?'.<br>**Suggested Noise:** ['study', 'by', 'one'] | Done |
| `a8a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u3c301` | Noise Word Overlap | Noise word(s) 'than' present in primary English sentence 'Emma always gets up earlier than me.'.<br>**Suggested Noise:** ['early', 'more', 'as', 'I'] | Done |
| `a8a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u3c305` | Noise Word Overlap | Noise word(s) 'anything' present in primary English sentence 'I love playing sports more than anything.'.<br>**Suggested Noise:** ['most', 'like', 'best', 'everything'] | Done |
| `a8a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u3c309` | Noise Word Overlap | Noise word(s) 'more', 'than' present in primary English sentence 'I'm as hard-working as you but you read more than me.'.<br>**Suggested Noise:** ['much', 'as', 'most', 'hardly'] | Done |
| `a8a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u3c310` | Noise Word Overlap | Noise word(s) 'hair', 'Ella' present in primary English sentence 'Emma is taller than Ella but her hair is shorter than Ella's.'.<br>**Suggested Noise:** ['ears', 'Elas', 'more', 'short'] | Done |
| `a8a-u3-sentence-architect.json` | 4. Sentence Architect (SA) | `s8u3c502` | Noise Word Overlap | Noise word(s) 'because' present in primary English sentence 'Because of that I try harder when I practise.'.<br>**Suggested Noise:** ['due', 'harder', 'practising'] | Done |
| `a8a-u3-text-navigator.json` | 6. Text Navigator (TN) | `Section A Activity 2a:s18` | Nesting Depth Exceeded | Node 's18' at depth 5 exceeds max allowed nesting depth of 4 levels. | Pending |
