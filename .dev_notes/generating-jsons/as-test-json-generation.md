# Generating `a7b-uz-test-as.json` & `a7b-uz-writing-map-as.json`

This note documents how we transformed the raw exam paper markdown (`a7b-uz-test-as.md`) and the writing task markdown (`a7b-uz-writing-task-as.md`) into structured JSON files following the `GEMINI.md` specification.

## Methodology

### 1. Exam Structure Analysis & Mapping
We analyzed [a7b-uz-test-as.md](file:///home/timathon/codes/smartedu/english-practices/data/A7B/a7b-uz/a7b-uz-test-as.md) and mapped each section to its corresponding schema:
- **Section 1-4 (`s1` - `s4`):** Reading Comprehension multiple-choice items mapped to `"type": "reading-comprehension"`. Options had their `A. `, `B. `, etc. prefixes stripped to keep data clean.
- **Section 5 (`s5`):** Family Rules passage with gaps to be filled from options A-E. Under the rule, we mapped this to `"type": "cloze-passage-wordbank"`.
- **Section 6 (`s6`):** The traditional Cloze Passage ("Farmer in the State of Song") mapped to `"type": "cloze-passage"`.
- **Section 7 (`s7`):** The "语篇填空" (Mount Huangshan) was converted from a free-text fill-in-the-blank to `"type": "cloze-passage"` (multiple-choice dropdown options) to follow the digital test sheet pattern. We created grammatical/spelling distractors for each target word.
- **Section 8 (`s8`):** The "阅读与表达" section was mapped to `"type": "reading-comprehension"`. Questions 41-43 were mapped to single-choice questions, and Question 44 (the open-ended writing prompt) was converted to a multiple-choice selection targeting the most appropriate response.

### 2. Writing Task Analysis & Mapping
We analyzed [a7b-uz-writing-task-as.md](file:///home/timathon/codes/smartedu/english-practices/data/A7B/a7b-uz/a7b-uz-writing-task-as.md) and mapped it to the `Model Writing Map (MWM)` schema in `a7b-uz-writing-map-as.json`:
- **Model Essay Basic:** Represents the original model essay provided in the exam key as a hierarchical, step-by-step tree structure.
- **Model Essay Advanced:** Developed an enhanced essay on the same topic ("My Most Special Day"), integrating complex syntactic structures (e.g. "To celebrate it", "Not only... but also", "where" relative clauses, and transitional words like "In addition", "Although") to guide students' writing upgrade.

### 3. Automation and Generation
We created temporary Python scripts:
- [gen_json.py](file:///home/timathon/.gemini/antigravity-ide/brain/6b8dfd6c-2f89-44eb-917d-64bb283ecea7/scratch/gen_json.py) for the exam JSON.
- [gen_writing_map.py](file:///home/timathon/.gemini/antigravity-ide/brain/6b8dfd6c-2f89-44eb-917d-64bb283ecea7/scratch/gen_writing_map.py) for the writing map JSON.

### 4. Validation
We validated both files using structural checks to guarantee correct formatting, unique alphanumeric node IDs, and accurate option index alignments.
