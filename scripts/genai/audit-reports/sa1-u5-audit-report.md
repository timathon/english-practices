# Audit Report: Practice JSONs for `v2-data/SA1/sa1-u5`

**Target Directory:** `v2-data/SA1/sa1-u5`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 127

---

## Summary by File

- **`sa1-u5-vocab-guide.json`**: ⚠️ 14 issue(s), 0 fixed, 14 pending
- **`sa1-u5-vocab-master.json`**: ⚠️ 19 issue(s), 18 fixed, 1 pending
- **`sa1-u5-spelling-hero.json`**: ⚠️ 33 issue(s), 33 fixed, 0 pending
- **`sa1-u5-sentence-architect.json`**: ⚠️ 61 issue(s), 60 fixed, 1 pending
- **`sa1-u5-recall-map.json`**: ✅ PASS (0 issues)
- **`sa1-u5-text-navigator.json`**: ✅ PASS (0 issues)
- **`sa1-u5-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`sa1-u5-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0400102` | En2Cn Distractor Language | En2Cn option [0] contains raw English text: '(Common Era) 公元' | En2Cn option [1] contains raw English text: '(Before Christ) 公元前' |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0300103` | LLM: Low Quality Distractor / Semantic Separation | Distractors like '小气；吝啬' (the verb/adjective meaning of mean) and '肉类食品' are completely disconnected from the noun 'means' (methods/ways) contextually expected here, making them absurd non-sequiturs for students.<br>**Suggested Options:** ['方式；方法；途径', '意义；意图', '结果；后果', '原因；理由', '条件；情况', '目的；目标'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0300106` | LLM: Low Quality Distractor / Implausible Options | Distractors such as '化学品' (chemicals), '救护车' (ambulance), '咖啡馆' (cafe), and '骆驼' (camel) are completely ridiculous and random semantic items that offer zero cognitive challenge or plausible trap value.<br>**Suggested Options:** ['文字；符号；角色；品质；特点', '特征；特性；特色', '性格；个性；品格', '雕刻；铭刻；印记', '行为；表现；举止', '标志；记号；符号'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0300109` | LLM: Low Quality Distractor / Implausible Options | Distractors like '仙女；精灵' (fairy), '集市；庙会' (fair), and '骆驼/航空' are phonetic or random mismatches that fail to test genuine semantic understanding against close synonyms.<br>**Suggested Options:** ['公共事务；事件；关系', '努力；尝试；企图', '影响；效力；作用', '效果；结果；成效', '情况；状态；局势', '活动；运动；行动'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0400102` | LLM: Low Quality Distractor / Implausible Options | While acronym expansions are mildly plausible, distractors like '首席执行官' (CEO) and '计算机工程' are extremely far-fetched domain acronyms for a primary/middle school level, making the real historical abbreviation too obvious.<br>**Suggested Options:** ['(Common Era) 公元', '(Before Christ) 公元前', '(Current Edition) 当前版本', '(Closed Economy) 封闭经济', '(Civil Engineering) 土木工程', '(Core Element) 核心要素'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0400108` | LLM: Low Quality Distractor / Obvious Correct Answer | The distractors ('铁路', '高速公路', '人行道', etc.) are very loose conceptual categories that do not share the specific compound-noun structure or direct translation ambiguity typical of transit terms, making '地铁' stand out immediately.<br>**Suggested Options:** ['地铁', '轻轨', '隧道', '高架桥', '公交车', '渡轮'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500104` | LLM: Low Quality Distractor | Distractors like 'brand', 'strand', and 'stand' are rhyming/phonetic traps based on spelling suffixes, but in a semantic cloze testing vocabulary, distractors should ideally be near-synonyms or semantic confusions (e.g., request, order, command) rather than pure rhyming words that disrupt contextual meaning.<br>**Suggested Options:** ['demand', 'command', 'request', 'statement', 'complaint', 'suggestion'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500106` | LLM: Low Quality Distractor | Using a list of complex words ending in '-scription' (subscription, prescription, inscription, etc.) turns this into a Latin root/suffix morphology test rather than a practical English-Chinese vocabulary check for middle schoolers, making the distractors overly academic and unnatural.<br>**Suggested Options:** ['description', 'definition', 'direction', 'discussion', 'decision', 'destination'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0500107` | LLM: Low Quality Distractor | All options are verbs ending in '-ate' (debate, create, translate, locate, estate), which tests visual suffix recognition rather than the actual semantic collocations of the phrasal framework 'relate to'.<br>**Suggested Options:** ['relate', 'refer', 'connect', 'lead', 'point', 'turn'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0600104` | LLM: Low Quality Distractor | The prompt contains a strong collocation constraint ('gap'). While 'bridge', 'narrow', 'close', and 'fill' are all acceptable semantic collocations with 'gap', having multiple valid answers in a single-choice cloze question makes the test item flawed because test-takers could reasonably select 'fill' or 'close'.<br>**Suggested Options:** ['bridge', 'face', 'cross', 'mind', 'skip', 'jump'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0700107` | LLM: Low Quality Distractor | Distractors like 'stells' are completely nonsense words (non-existent in standard English), which provides no real phonetic or semantic challenge for students.<br>**Suggested Options:** ['shells', 'smells', 'spells', 'swells', 'spills', 'stems'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0700110` | LLM: Low Quality Distractor | Distractors like 'Disaster', 'Distance', and 'Directory' share very little meaningful visual or phonetic connection to 'Dynasty' in a cloze testing context compared to closer lexical or suffix traps.<br>**Suggested Options:** ['Dynasty', 'Nasty', 'Density', 'Distance', 'Destination', 'Distribution'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0800107` | LLM: Low Quality Distractor | Distractors like 'ambulances', 'cafes', and 'camels' are completely nonsensical semantic non-sequiturs in the context of writing systems and language art forms.<br>**Suggested Options:** ['characters', 'characteristics', 'chemicals', 'channels', 'challenges', 'chapters'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0800110` | LLM: Low Quality Distractor | Distractors like 'fairies' and 'aviation' create odd semantic and visual mismatches for 'global affairs', lacking well-balanced collocate traps.<br>**Suggested Options:** ['affairs', 'fairs', 'efforts', 'effects', 'events', 'areas'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0900101` | LLM: Low Quality Distractor | While the distractors all start with 'a' and have similar lengths, words like 'accelerate' and 'accumulate' make little semantic sense with 'culture', leaving the actual competition mostly to 'appropriate' and 'anticipate'. The semantic trap can be tightened by using words that more closely mimic collocation patterns or semantic fields of value/understanding.<br>**Suggested Options:** ['appreciate', 'approach', 'approve', 'appeal', 'apply', 'attach'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0900103` | LLM: Phonetic/Visual Trap Imbalance | The distractor 'smuggler' is a noun rather than a singular countable noun/abstract concept fitting the predicate noun slot equally well in terms of strict grammar (though both can fit a copular sentence, 'smuggler' is a person, making it semantically absurd: 'it was a smuggler'). Distractors should all be abstract nouns to maintain a tight semantic and syntactic trap.<br>**Suggested Options:** ['struggle', 'stranger', 'structure', 'strategy', 'strength', 'stumble'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0900105` | LLM: Irrelevant/Nonsensical Distractors | The prompt asks to tick pairs of words the student is confused by ('____ / term'), but the options mix exact synonyms/near-synonyms with completely unrelated school words like 'subject' and 'section'. If testing near-synonyms or confusable words (like term vs. semester vs. session), all distractors should be terms denoting periods of an academic year or closely related educational time divisions.<br>**Suggested Options:** ['semester', 'quarter', 'trimester', 'session', 'period', 'cycle'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0900107` | LLM: Semantic Over-homogeneity | The options are all compounds ending in '-way' ('subway', 'railway', 'highway', 'pathway', 'gateway', 'walkway'). While this creates a strong visual/structural trap, in New York context, both 'subway' and 'railway' or 'highway' could cause confusion, but 'gateway' and 'walkway' are semantically weak. More globally recognized urban transit terms would make better lexical distractors.<br>**Suggested Options:** ['subway', 'railway', 'tramway', 'highway', 'parkway', 'causeway'] | Done |
| `sa1-u5-vocab-master.json` | 2. Vocab Master (VM) | `q0900108` | LLM: Visual/Morphological Trap Quality | The options rhyme or share the '-ment' suffix ('apartment', 'department', 'basement', 'document', 'pavement', 'statement'). However, 'document' and 'statement' are inanimate abstract nouns that cannot be lived in, making them non-viable semantic distractors for anyone reading the full sentence context ('live in a beautiful ____'). Better distractors would be types of dwellings or buildings ending in similar suffixes.<br>**Suggested Options:** ['apartment', 'basement', 'pavement', 'settlement', 'monument', 'attachment'] | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `base` | ID Format | Word ID 's5w1s10b1' for 'base' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `bone` | ID Format | Word ID 's5w1s11b2' for 'bone' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `shell` | ID Format | Word ID 's5w1s12b3' for 'shell' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `symbol` | ID Format | Word ID 's5w1s13b4' for 'symbol' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `carve` | ID Format | Word ID 's5w1s14b5' for 'carve' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `dynasty` | ID Format | Word ID 's5w1s15b6' for 'dynasty' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `variety` | ID Format | Word ID 's5w1s16b7' for 'variety' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `major` | ID Format | Word ID 's5w1s17b8' for 'major' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `dialect` | ID Format | Word ID 's5w1s18b9' for 'dialect' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `means` | ID Format | Word ID 's5w1s19c1' for 'means' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `classic` | ID Format | Word ID 's5w1s20c2' for 'classic' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `regard` | ID Format | Word ID 's5w1s21c3' for 'regard' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `character` | ID Format | Word ID 's5w1s22c4' for 'character' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `calligraphy` | ID Format | Word ID 's5w1s23c5' for 'calligraphy' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `global` | ID Format | Word ID 's5w1s24c6' for 'global' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `affair` | ID Format | Word ID 's5w1s25c7' for 'affair' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `appreciate` | ID Format | Word ID 's5w1s26c8' for 'appreciate' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `specific` | ID Format | Word ID 's5w1s27c9' for 'specific' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `CE` | ID Format | Word ID 's5w1s28d1' for 'CE' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `struggle` | ID Format | Word ID 's5w1s29d2' for 'struggle' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `tongue` | ID Format | Word ID 's5w1s30d3' for 'tongue' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `semester` | ID Format | Word ID 's5w1s31d4' for 'semester' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `petrol` | ID Format | Word ID 's5w1s32d5' for 'petrol' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `subway` | ID Format | Word ID 's5w1s33d6' for 'subway' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `apartment` | ID Format | Word ID 's5w1s34d7' for 'apartment' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `pants` | ID Format | Word ID 's5w1s35d8' for 'pants' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `beg` | ID Format | Word ID 's5w1s36d9' for 'beg' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `equal` | ID Format | Word ID 's5w1s37e1' for 'equal' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `gap` | ID Format | Word ID 's5w1s38e2' for 'gap' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `demand` | ID Format | Word ID 's5w1s39e3' for 'demand' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `vocabulary` | ID Format | Word ID 's5w1s40e4' for 'vocabulary' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `description` | ID Format | Word ID 's5w1s41e5' for 'description' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-spelling-hero.json` | 3. Spelling Hero (SH) | `relate` | ID Format | Word ID 's5w1s42e6' for 'relate' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q1` | ID Format | Sentence ID 's5s1q1' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q2` | ID Format | Sentence ID 's5s1q2' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q2` | Noise Word Overlap | Noise word(s) 'possible' present in primary English sentence 'There are many reasons why this has been possible.'.<br>**Suggested Noise:** ['possibility', 'possibly', 'impossible'] | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q3` | ID Format | Sentence ID 's5s1q3' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q3` | Noise Word Overlap | Noise word(s) 'based' present in primary English sentence 'At the beginning, written Chinese was a picture-based language.'. | Pending |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q4` | ID Format | Sentence ID 's5s1q4' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q5` | ID Format | Sentence ID 's5s1q5' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q6` | ID Format | Sentence ID 's5s1q6' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q7` | ID Format | Sentence ID 's5s1q7' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q8` | ID Format | Sentence ID 's5s1q8' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q9` | ID Format | Sentence ID 's5s1q9' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q9` | Noise Word Overlap | Noise word(s) 'emperor', 'characters' present in primary English sentence 'Chinese characters unified the writing system under Emperor Qinshihuang.'.<br>**Suggested Noise:** ['character', 'letter', 'symbols'] | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s1q10` | ID Format | Sentence ID 's5s1q10' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q1` | ID Format | Sentence ID 's5s2q1' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q1` | Noise Word Overlap | Noise word(s) 'still' present in primary English sentence 'Even today, they can all still communicate in writing.'.<br>**Suggested Noise:** ['yet', 'already', 'even'] | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q2` | ID Format | Sentence ID 's5s2q2' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q2` | Noise Word Overlap | Noise word(s) 'different' present in primary English sentence 'No matter where Chinese people live, they speak different dialects.'.<br>**Suggested Noise:** ['differ', 'difference', 'various'] | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q3` | ID Format | Sentence ID 's5s2q3' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q3` | Noise Word Overlap | Noise word(s) 'become' present in primary English sentence 'Written Chinese has also become an important means of communication.'.<br>**Suggested Noise:** ['became', 'becoming', 'grew'] | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q4` | ID Format | Sentence ID 's5s2q4' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q5` | ID Format | Sentence ID 's5s2q5' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q5` | Noise Word Overlap | Noise word(s) 'ancient' present in primary English sentence 'People in modern times can read the classic works from ancient times.'.<br>**Suggested Noise:** ['antiquity', 'anciently', 'historical'] | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q6` | ID Format | Sentence ID 's5s2q6' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q7` | ID Format | Sentence ID 's5s2q7' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q8` | ID Format | Sentence ID 's5s2q8' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q9` | ID Format | Sentence ID 's5s2q9' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q10` | ID Format | Sentence ID 's5s2q10' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s2q10` | Noise Word Overlap | Noise word(s) 'learn' present in primary English sentence 'They learn about history through this amazing language.'.<br>**Suggested Noise:** ['learns', 'learning', 'studied'] | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q1` | ID Format | Sentence ID 's5s3q1' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q2` | ID Format | Sentence ID 's5s3q2' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q3` | ID Format | Sentence ID 's5s3q3' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q4` | ID Format | Sentence ID 's5s3q4' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q5` | ID Format | Sentence ID 's5s3q5' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q6` | ID Format | Sentence ID 's5s3q6' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q6` | Noise Word Overlap | Noise word(s) 'only', 'but' present in primary English sentence 'Calligraphy was not only a beautiful art form but also a means of expression.'.<br>**Suggested Noise:** ['merely', 'however', 'expressive'] | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q7` | ID Format | Sentence ID 's5s3q7' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q8` | ID Format | Sentence ID 's5s3q8' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q9` | ID Format | Sentence ID 's5s3q9' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s3q10` | ID Format | Sentence ID 's5s3q10' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q1` | ID Format | Sentence ID 's5s4q1' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q2` | ID Format | Sentence ID 's5s4q2' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q3` | ID Format | Sentence ID 's5s4q3' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q4` | ID Format | Sentence ID 's5s4q4' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q5` | ID Format | Sentence ID 's5s4q5' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q6` | ID Format | Sentence ID 's5s4q6' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q7` | ID Format | Sentence ID 's5s4q7' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q8` | ID Format | Sentence ID 's5s4q8' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q9` | ID Format | Sentence ID 's5s4q9' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s4q10` | ID Format | Sentence ID 's5s4q10' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q1` | ID Format | Sentence ID 's5s5q1' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q2` | ID Format | Sentence ID 's5s5q2' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q3` | ID Format | Sentence ID 's5s5q3' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q3` | Noise Word Overlap | Noise word(s) 'finally' present in primary English sentence 'I finally understood the reason why my mum had encouraged me.'.<br>**Suggested Noise:** ['encouraging', 'which', 'final'] | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q4` | ID Format | Sentence ID 's5s5q4' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q5` | ID Format | Sentence ID 's5s5q5' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q6` | ID Format | Sentence ID 's5s5q6' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q7` | ID Format | Sentence ID 's5s5q7' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q8` | ID Format | Sentence ID 's5s5q8' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q9` | ID Format | Sentence ID 's5s5q9' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q10` | ID Format | Sentence ID 's5s5q10' is not an 8-character alphanumeric string. | Done |
| `sa1-u5-sentence-architect.json` | 4. Sentence Architect (SA) | `s5s5q4` | LLM: Low Quality Noise | The noise item 'diaries daily' contains two words and a space, which is not a standard single-word distractor.<br>**Suggested Noise:** ['watching', 'daily', 'cartoons''] | Done |
