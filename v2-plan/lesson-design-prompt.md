HTML Lesson Design Prompt Template

Copy and paste the prompt below into an LLM (attaching or pasting your textbook material/lesson topic where indicated):

---

# PROMPT BEGINS HERE

**Role:** You are an expert K-12 English Instructional Designer and Senior Secondary/Middle School English Teacher.

**Task:** Based on the provided teaching materials/textbook content below, design a comprehensive, modern, and beautifully formatted single-file HTML lesson design document (教学设计与导学练).

---

## 1. Document Structure & Content Requirements

The output must be a fully self-contained HTML file formatted cleanly and structured strictly for **clean 3-page A4 printing**:

### Header & Metadata Banner:
- **Title (`<h1>`)**: Lesson Title & Section (e.g., `Unit 1 You and Me · Section A 教学设计`).
- **Unit BIG Question**: Highlighted banner directly under `<h1>` (e.g., `❓ BIG Question: How do we make new friends? / How do we get to know each other?`).
- **Metadata Grid**: Class Type (e.g., 听说与语法综合课 / 读写与项目综合课), Duration (1 课时 / 45 分钟), Grade Level (e.g., 七年级 Grade 7), and Textbook Module/Pages.

### Core Competencies (核心素养):
- 4 dimensions in a 2x2 grid: **Language Ability (语言能力)**, **Cultural Awareness (文化意识)**, **Thinking Qualities (思维品质)**, **Learning Ability (学习能力)**.

### Key & Difficult Points (教学重难点) & Methods:
- **Focus Points (教学重点)**: Core sentence patterns, pronunciation, vocabulary & grammar points.
- **Difficult Points (教学难点)**: Must include special question word order (特殊疑问句语序), phonetic discrimination (e.g., 前元音发音辨析), contraction pronunciation in continuous speech (be 动词缩略读音与弱读连读), and cross-cultural naming/etiquette rules (跨文化称谓认知与得体运用).
- **Methods & Aids**: Teaching approaches (e.g., 情境教学法, 任务型教学法 TBLA/TBLT, 交际法 CLT, 项目式学习 PBL) and instructional aids.

---

### 一、教学详案 (Detailed Lesson Plan Table):
- Clean structured table with columns: **教学环节与时间 (Stage & Time)**, **教师活动 (Teacher Steps & Sample Scripts)**, **学生活动 (Student Activities)**, **设计意图 (Design Rationale)**.
- Include 5–6 clear steps covering:
  1. *Warm-up / Lead-in*
  2. *Listening / Reading Input & Information Gathering*
  3. *Dialogue / Language Exploration & Cultural Focus*
  4. *Grammar Deduction / Writing Scaffolding*
  5. *Practice, Transfer & Project / Role-play*
  6. *Summary, Thematic Values & Homework*

---

### 二、板书设计 (Blackboard Design Layout):
- Positioned strictly after Section I.
- Styled visually to simulate a real classroom chalkboard (dark green background `#1b382b`, wooden border `#5c3a21`, colored chalk highlights in yellow `#fef08a`, cyan `#67e8f9`, and pink `#f472b6`).
- **Layout (3 Columns)**:
  - **Column 1**: Core Inquiries / Key Sentence Patterns / Information Dimensions.
  - **Column 2**: Grammar Focus & Formulas / Chants / Writing Scaffolding.
  - **Column 3**: Cultural Focus / Reading Plus Golden Rules / **4-Group PK Board** (`Group 1–4` with points, e.g., `Group 1: 40 pts`, `Group 2: 50 pts`, etc.).

---

### 三、学生课后练习 (Student After-Class Practice Sheet):
- **Header**: Student Info Bar (班级、姓名、得分).
- **第一部分：基础巩固**:
  - *(A) 核心词汇与短语拼写与中英互译* (Ensure strict accuracy to textbook parts of speech, e.g., *mistake n. 错误;失误*).
  - *(B) 根据中文提示完成核心交际问句* (Sentence translation for target inquiries, e.g., *"May I have your name?", "Where are you from?", "What class are you in?", "Who's your class teacher?"*).
  - *Grammar Form completion / Sentence choice*.
- **第二部分：能力提升**:
  - *Contextual Dialogue Completion / Reading Comprehension / Profile Writing (30–50 words)*.
- **附录（若教材包含 Reading Plus）**:
  - **Appendix: Guide to Reading Plus** (Structure analysis, summary of 3 practical advice items, reading comprehension).
- **第三部分：课后自我评价表 (Self-Assessment Checklist)**:
  - 3-level rating rubric (优秀 ⭐⭐⭐ / 良好 ⭐⭐ / 加油 ⭐) across 3–4 competency indicators.
- **下节课预习任务 (Next Lesson Preview)**:
  - Concise dashed box with targeted preview questions and vocabulary exploration.

> **Note on Exercise Labels:** Do NOT include labels or badges like "必做" (Mandatory) or "选做" (Optional). Keep titles clean as "第一部分：基础巩固" and "第二部分：能力提升".

---

## 2. A4 Print Optimization & Technical Requirements

- **Strict 3-Page A4 Pagination**:
  - **Page 1 (A4 Sheet 1)**: Header Banner, Big Question, Core Competencies (2x2), Key/Difficult Points & Methods, Detailed Lesson Plan **Steps 1–2**.
  - **Page 2 (A4 Sheet 2)**: Detailed Lesson Plan **Steps 3–6** (续表), and **Blackboard Design Layout** (`.board-container`).
  - **Page 3 (A4 Sheet 3)**: Student Practice Sheet (Part 1 Foundation + Part 2 Capability + Appendix/Reading Plus Guide + Self-Assessment + Next Lesson Preview).
- **Single-file HTML**: Embed all CSS inside a `<style>` block in the `<head>`. Do not rely on external JS/CSS frameworks.
- **Clean Code**: No nested markdown backtick blocks inside the code.
- **Print CSS Standards**:
  ```css
  @page {
    size: A4 portrait;
    margin: 8mm 16mm; /* Comfortable side margins for reading and binding */
  }
  @media print {
    html, body {
      background: #ffffff !important;
      font-size: 10.5pt;
    }
    .no-print-bar { display: none !important; }
    .a4-page {
      box-shadow: none !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: always !important;
      break-after: page !important;
      height: auto !important;
    }
    .a4-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .board-container {
      background: #1b382b !important;
      color: #ffffff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
  ```
- **Interactive UI Feature**: Include a top screen helper bar `.no-print-bar` with a 1-click print button (`window.print()`).

---

## 3. Source Teaching Materials

- **Unit / Topic:** [Insert Topic/Unit Title Here, e.g., Unit 1 You and Me - Section A / Section B]
- **Grade Level:** [Insert Grade Level, e.g., Seven / 初一]
- **Textbook Material / Text / Notes:**

[Paste your textbook markdown, dialogue transcripts, grammar focus, vocabulary list, or upload PDF/images here]