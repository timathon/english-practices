# Audit Report: Practice JSONs for `v2-data/SA1/sa1-u2`

**Target Directory:** `v2-data/SA1/sa1-u2`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 38

---

## Summary by File

- **`sa1-u2-vocab-guide.json`**: ✅ PASS (0 issues)
- **`sa1-u2-vocab-master.json`**: ⚠️ 26 issue(s)
- **`sa1-u2-spelling-hero.json`**: ⚠️ 2 issue(s)
- **`sa1-u2-sentence-architect.json`**: ⚠️ 10 issue(s)
- **`sa1-u2-recall-map.json`**: ✅ PASS (0 issues)
- **`sa1-u2-text-navigator.json`**: ✅ PASS (0 issues)
- **`sa1-u2-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`sa1-u2-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `Question Volume` | Volume Deficit | Generated 40 questions; expected target ~100 based on formula (61 items * 1.5). |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `u1v2w3x4` | Duplicate ID | Duplicate question ID 'u1v2w3x4' found. |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `k7l8m9n0` | Distractor PoS Mismatch | Question k7l8m9n0 (empire [noun]): distractor 'admire' has mismatching PoS [verb]. |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `m7n8o9p0` | Distractor PoS Mismatch | Question m7n8o9p0 (passport [noun]): distractor 'transport' has mismatching PoS [verb]. |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `m7n8o9p0` | Distractor PoS Mismatch | Question m7n8o9p0 (passport [noun]): distractor 'credit card' has mismatching PoS [phrase]. |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `Vocabulary Coverage` | Missing Item Coverage | The following 21 non-proper vocabulary items were not tested in VM: ['type', 'view', 'credit card', 'rainforest', 'amazed', 'request', 'flight', 'other than', 'sight', 'package tour', 'path', 'credit', 'tomb', 'economic', 'flat', 'make up', 'package', 'take control of', 'hike', 'overnight', 'architect'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `o1p2q3r4` | LLM: Low Quality Distractor | Distractors like '帝国' (empire) and '建筑师' (architect) are slightly mismatched in semantic category compared to human roles like '官员', '士兵', '向导'.<br>**Suggested Options:** ['国王', '官员', '士兵', '向导', '皇帝', '首相'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `s5t6u7v8` | LLM: Low Quality Distractor | Options like '国家' and '边境' are somewhat loosely related to locations, but could be tighter semantically.<br>**Suggested Options:** ['风景', '视力', '地点；位置；现场', '空间', '座位', '场景'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `w9x0y1z2` | LLM: Low Quality Distractor | Options like '办公室' and '古老的' are a bit weak and easily dismissable as semantic traps.<br>**Suggested Options:** ['办公室', '军官', '传统的', '官方的；正式的；公务的', '公开的', '合法的'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `a3b4c5d6` | LLM: Low Quality Distractor | Distractors like '推荐' and '联络' lack close phonetic or semantic proximity to recognition.<br>**Suggested Options:** ['意识到', '辨别出；承认；认可', '记得', '回忆', '实现', '接受'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `e7f8g9h0` | LLM: Low Quality Distractor | Words like '风景' and '交流' are poor distractors for a noun meaning housing or lodging.<br>**Suggested Options:** ['交流', '交通运输', '住处；停留处；膳宿', '旅行计划', '安排', '适应'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `i1j2k3l4` | LLM: Low Quality Distractor | Distractors like '极其的' and '古董的' do not serve as strong semantic counterparts to 'unique'.<br>**Suggested Options:** ['唯一的；独特的；特有的', '罕见的', '普遍的', '优秀的', '个性的', '美丽的'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `m5n6o7p8` | LLM: Low Quality Distractor | Distractors like '资料手册' and '描述' are completely unrelated to travel destinations.<br>**Suggested Options:** ['出发地', '目的地；终点', '路线', '终点站', '路程', '距离'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `q9r0s1t2` | LLM: Low Quality Distractor | Distractors like '基础设施' and '文明' are too broad compared to architecture.<br>**Suggested Options:** ['农业', '考古学', '建筑设计师', '结构', '工程学', '建筑设计；建筑学'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `u3v4w5x6` | LLM: Low Quality Distractor | Distractors like '支票' and '护照' are random travel items rather than printed information materials.<br>**Suggested Options:** ['资料（或广告）手册', '明信片', '课本', '地图', '传单', '杂志'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `y7z8a9b0` | LLM: Low Quality Distractor | Distractors like '组织' are weak semantic distractors.<br>**Suggested Options:** ['公民', '城市化', '文化', '文明；文明世界', '社会', '历史'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `c1d2e3f4` | LLM: Low Quality Distractor | Distractor '肩膀' is a phonetic/visual trap (sounding like 'shoulder'), but the others are simple human roles. A stronger mix of phonetic or visual traps would improve quality.<br>**Suggested Options:** ['肩膀', '士兵；军人', '皇帝', '官员', '水手', '首领'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `g5h6i7j8` | LLM: Low Quality Distractor | Distractors like '翻译' and '转让' use morphological components that don't fit well as primary distractors.<br>**Suggested Options:** ['护照', '机场', '交通运输系统 / 运输', '进口', '出口', '港口'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `k9l0m1n2` | LLM: Low Quality Distractor | Distractors like '头等舱' and '节假日' are weakly related.<br>**Suggested Options:** ['生态', '经济；节约', '农业', '商务舱', '金融', '商业'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `o3p4q5r6` | LLM: Low Quality Distractor | Distractors like '尾巴' and '延期' are weak.<br>**Suggested Options:** ['零售', '尾巴', '大纲', '延期', '细节；详情；细微之处', '数据'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `s7t8u9v0` | LLM: Low Quality Distractor | Distractor '车站' is a phonetic/visual trap for 'station', but the rest are generic.<br>**Suggested Options:** ['雕塑；雕像', '身份；地位', '法律；法规', '状态', '法规', '坟墓'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `w1x2y3z4` | LLM: Low Quality Distractor | Compound words ending in -book make good distractors, but some options like 'passport' and 'brochure' break the morphological pattern.<br>**Suggested Options:** ['notebook', 'textbook', 'guidebook', 'workbook', 'cookbook', 'storybook'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `a5b6c7d8` | LLM: Low Quality Distractor | Mixing compounds ending in -fall with generic bodies of water ('river', 'lake') reduces distractor homogeneity.<br>**Suggested Options:** ['rainfall', 'waterfall', 'snowfall', 'waterway', 'waterfront', 'stream'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `e9f0g1h2` | LLM: Low Quality Distractor | Mixing -way compounds with generic road terms like 'path' and 'street' reduces distractor quality.<br>**Suggested Options:** ['railway', 'subway', 'runway', 'gateway', 'highway', 'pathway'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `i3j4k5l6` | LLM: Low Quality Distractor | Distractors lack strong morphological similarity (all are -ing words, but sharing 'sight' or travel roots would be better).<br>**Suggested Options:** ['shopping', 'hiking', 'sighting', 'sightseeing', 'exploring', 'travelling'] |
| `sa1-u2-vocab-master.json` | 2. Vocab Master (VM) | `m7n8o9p0` | LLM: Low Quality Distractor | Distractors are a mix of travel documents and infrastructure.<br>**Suggested Options:** ['transport', 'passport', 'visa', 'postcard', 'password', 'port'] |
| `sa1-u2-spelling-hero.json` | 3. Spelling Hero (SH) | `Coverage` | Missing Single Words | Single-word vocabulary items missing from Spelling Hero: {'BCE'} |
| `sa1-u2-spelling-hero.json` | 3. Spelling Hero (SH) | `detail_chunk_1` | Duplicate Options | Chunk options contain duplicates: ['tail', 'tale', 'tale'] |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c102` | Noise Word Overlap | Noise word 'weeks' is already present in primary English sentence 'I'm travelling around Europe for two weeks with my aunt and uncle.'. |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c105` | Noise Word Overlap | Noise word 'tomorrow' is already present in primary English sentence 'I'm not packing until the day after tomorrow.'. |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c301` | Noise Word Overlap | Noise word 'famous' is already present in primary English sentence 'The Inca emperor lived in the now-famous site Machu Picchu.'. |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c301` | Noise Word Overlap | Noise word 'emperor' is already present in primary English sentence 'The Inca emperor lived in the now-famous site Machu Picchu.'. |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c302` | Noise Word Overlap | Noise word 'the' is already present in primary English sentence 'Spain took control of Peru in the 16th century and ruled until 1821.'. |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c304` | Noise Word Overlap | Noise word 'needed' is already present in primary English sentence 'Inca builders cut stones to exact sizes so that nothing was needed to hold walls together other than the perfect fit of the stones.'. |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c304` | Noise Word Overlap | Noise word 'stones' is already present in primary English sentence 'Inca builders cut stones to exact sizes so that nothing was needed to hold walls together other than the perfect fit of the stones.'. |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c503` | Noise Word Overlap | Noise word 'sixteen' is already present in primary English sentence 'It leans so far on one side that if you dropped a stone from the top, it would fall sixteen feet from the base of the tower.'. |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c503` | Noise Word Overlap | Noise word 'feet' is already present in primary English sentence 'It leans so far on one side that if you dropped a stone from the top, it would fall sixteen feet from the base of the tower.'. |
| `sa1-u2-sentence-architect.json` | 4. Sentence Architect (SA) | `s1u2c508` | Noise Word Overlap | Noise word 'distance' is already present in primary English sentence 'For long-distance trips between cities, trains are my favourite.'. |
