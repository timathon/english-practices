# Audit Report: Practice JSONs for `v2-data/SA1/sa1-u1`

**Target Directory:** `v2-data/SA1/sa1-u1`  
**Audit Standard:** Rules specified in `GEMINI.md`  
**Total Issues Identified:** 25

---

## Summary by File

- **`sa1-u1-vocab-guide.json`**: ✅ PASS (0 issues)
- **`sa1-u1-vocab-master.json`**: ⚠️ 25 issue(s)
- **`sa1-u1-spelling-hero.json`**: ✅ PASS (0 issues)
- **`sa1-u1-sentence-architect.json`**: ✅ PASS (0 issues)
- **`sa1-u1-recall-map.json`**: ✅ PASS (0 issues)
- **`sa1-u1-text-navigator.json`**: ✅ PASS (0 issues)
- **`sa1-u1-grammar-wizard.json`**: ✅ PASS (0 issues)
- **`sa1-u1-passage-decoder-s.json`**: ✅ PASS (0 issues)

---

## Detailed Issues Log

| JSON File | Rule Section | Item ID / Target | Issue Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `e06nmugk` | LLM: Low Quality Distractor | Option 'challenger' is a semantic/morphological mismatch compared to the tight cluster of '-ger' suffix nouns sharing visual and phonetic characteristics.<br>**Suggested Options:** ['passenger', 'manager', 'stranger', 'teenager', 'villager', 'messenger'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `08zj37vw` | LLM: Low Quality Distractor | Option 'challenger' breaks the strict visual and phonetic rhyme/suffix pattern (-ager/-ger nouns) used in the other distractors.<br>**Suggested Options:** ['passenger', 'manager', 'teenager', 'stranger', 'villager', 'messenger'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `bdnyuroy` | LLM: Low Quality Distractor | Option 'n. 挑战者' corresponds to 'challenger', which is less ideal than offering translations of phonetically or structurally similar words.<br>**Suggested Options:** ['n. 青少年', 'n. 经理', 'n. 乘客', 'n. 陌生人', 'n. 村民', 'n. 信使'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `u016918c` | LLM: Low Quality Distractor | Option 'career' is a noun that does not fit the multi-syllable agent/person suffix pattern (-er/-or) established by the other distractors.<br>**Suggested Options:** ['cheerleader', 'adviser', 'pioneer', 'volunteer', 'engineer', 'pensioner'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `8lpg1yc7` | LLM: Low Quality Distractor | Option 'career' lacks the standard personal noun suffix found in the rest of the options.<br>**Suggested Options:** ['adviser', 'volunteer', 'cheerleader', 'pioneer', 'engineer', 'pensioner'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `qwpx1pe5` | LLM: Low Quality Distractor | Option 'n. 职业' corresponds to 'career', which is structurally inconsistent with the agent-noun theme.<br>**Suggested Options:** ['n. 先锋', 'n. 顾问', 'n. 志愿者 & vi. 自愿', 'n. 工程师', 'n. 啦啦队员', 'n. 退休人员'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `zx3sr13f` | LLM: Low Quality Distractor | While all options share the '-able' suffix, some are less common or mismatched in register for middle school vocabulary (e.g., 'payable').<br>**Suggested Options:** ['suitable', 'stable', 'reliable', 'sensible', 'valuable', 'comfortable'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `zm2larzd` | LLM: Low Quality Distractor | Option 'payable' is a financial term less aligned with general middle-school descriptive adjectives compared to high-frequency alternatives.<br>**Suggested Options:** ['readable', 'reliable', 'stable', 'suitable', 'sensible', 'comfortable'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `9tb7pvs4` | LLM: Low Quality Distractor | Option 'adj. 应付的' corresponds to 'payable', which is less pedagogically useful than common descriptive adjectives.<br>**Suggested Options:** ['adj. 稳定的', 'adj. 可靠的', 'adj. 明智的', 'adj. 可读的', 'adj. 舒适的', 'adj. 合适的；适用的'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `9c7eroie` | LLM: Low Quality Distractor | The distractors (淡水, 新鲜, 框架, 自由, 友情) do not share the morphological suffix or structural compound clues typical of English-Chinese vocabulary tests, making the correct answer stand out purely by length and compound structure.<br>**Suggested Options:** ['n. 大学一年级新生；高一新生', 'n. 刚毕业的学生；校友', 'n. 转学生；插班生', 'n. 交换生', 'n. 优等生；学者', 'n. 研究生'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `i9vpthai` | LLM: Low Quality Distractor | Includes both 'confusing' and 'confused' in the options, which can act as a grammatical giveaway or cause unnecessary confusion regarding participial adjectives, while other distractors like 'excusing' are semantically weak in this context.<br>**Suggested Options:** ['amusing', 'exciting', 'convincing', 'surprising', 'confusing', 'boring'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `bepbfg51` | LLM: Low Quality Distractor | Simultaneously includes the present and past participle forms ('confusing' and 'confused'), which compromises the item's precision in testing the specific '-ing' adjective form.<br>**Suggested Options:** ['excusing', 'amusing', 'convincing', 'confusing', 'refusing', 'boring'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `bnhtfu1s` | LLM: Low Quality Distractor | Distractors feature a wide semantic spread making it easy to guess via elimination rather than precise lexical knowledge of 'confusing'.<br>**Suggested Options:** ['adj. 拒绝的', 'adj. 有说服力的', 'adj. 困惑的', 'adj. 有趣的', 'adj. 令人兴奋的', 'adj. 难以理解的；不清楚的'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `p8y0oohe` | LLM: Low Quality Distractor | Options include a direct noun derivation ('fluentness') and a noun/adjective mix ('fluid'), which creates uneven distractor quality.<br>**Suggested Options:** ['frequent', 'fluent', 'fluent', 'fluid', 'flexible', 'fluent'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `jaedhhak` | LLM: Low Quality Distractor | Includes 'recommendation' (a noun) alongside verb forms, making part-of-speech elimination too obvious since the blank requires a past-tense verb.<br>**Suggested Options:** ['commented', 'recommended', 'recorded', 'commanded', 'demanded', 'commended'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `8zxti7ko` | LLM: Low Quality Distractor | Options 'response' and 'responsiveness' are nouns, which violates part-of-speech parallelism since the prompt explicitly asks for an adjective (adj.).<br>**Suggested Options:** ['reasonable', 'sensible', 'responsible', 'respectable', 'responsive', 'reputable'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `brk7td3w` | LLM: Low Quality Distractor | Distractor 'n. 反应' is a noun, while the target word and correct answer are adjectives. Distractors should match the grammatical category to provide a proper semantic/grammatical trap.<br>**Suggested Options:** ['adj. 合理的', 'adj. 负责的；有责任的', 'adj. 值得尊敬的', 'adj. 敏感的', 'adj. 明智的', 'adj. 响应的'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `pwoerzeh` | LLM: Low Quality Distractor | Options 'sceptic' (noun referring to a person) and 'scholar' (noun referring to a person) are poor semantic fits in a sentence requiring an inanimate object/noun like 'schedule'.<br>**Suggested Options:** ['school', 'scheme', 'scope', 'scale', 'schedule', 'score'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `btsyv7zt` | LLM: Low Quality Distractor | Options 'scholar' and 'sceptic' are nouns denoting people, whereas 'schedule' is an abstract/inanimate noun and verb, making the phonetic/visual distractors mismatched in category.<br>**Suggested Options:** ['schedule', 'scheme', 'scope', 'scale', 'school', 'score'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `l1xck7n5` | LLM: Low Quality Distractor | Distractors like 'n. 学者' (scholar) or 'n. 学校' (school) are weak semantic/visual traps compared to closer conceptual terms like 'scheme' or 'scope'.<br>**Suggested Options:** ['n. 方案', 'n. 范围', 'n. 规模', 'n. 顺序', 'n. 学校', 'n. 日程安排；工作计划 vt. 安排'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `z653mwyp` | LLM: Low Quality Distractor | Including both the noun 'addiction' and the adjective 'addicted' as options in a sentence-completion task creates an overlapping form trap rather than testing semantic differentiation effectively.<br>**Suggested Options:** ['addictive', 'predicted', 'adopted', 'attracted', 'adapted', 'addicted'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `39q27h3p` | LLM: Low Quality Distractor | Including both 'addiction' (noun) and 'addicted' (adjective) in a Cn2En prompt for an adjective creates a redundant form-class distractor.<br>**Suggested Options:** ['addictive', 'attracted', 'predicted', 'adopted', 'adapted', 'addicted'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `k3s63nt2` | LLM: Low Quality Distractor | Distractor 'n. 瘾' is a noun, whereas the target word 'addicted' is an adjective. Part-of-speech should be consistent across options.<br>**Suggested Options:** ['adj. 吸引人的', 'adj. 预测的', 'adj. 有瘾的；上瘾的；入迷的', 'adj. 采用的', 'adj. 适应的', 'adj. 使人上瘾的'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `zjfvf4go` | LLM: Low Quality Distractor | Option 'beverage' is a semantic non-sequitur (drink) with only a superficial initial-letter overlap, making it too easily dismissed.<br>**Suggested Options:** ['behave', 'beginning', 'belief', 'benefit', 'behest', 'behaviour'] |
| `sa1-u1-vocab-master.json` | 2. Vocab Master (VM) | `adr2rv6k` | LLM: Low Quality Distractor | Option 'beverage' is completely unrelated semantically and functions as a weak distractor.<br>**Suggested Options:** ['behave', 'behaviour', 'belief', 'benefit', 'beginning', 'basis'] |
