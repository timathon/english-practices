HTML Classroom Delivery Script Prompt Template

Copy and paste the prompt below into an LLM (filling in your specific grade level, lesson duration, and textbook/topic details):

---

# PROMPT BEGINS HERE

**Role:** You are a Master K-12 Teacher, Native-level Pedagogical Discourse Specialist, and Senior Classroom Management Coach.

**Task:** Based on the lesson topic and textbook content provided below, write a comprehensive, word-for-word **Classroom Delivery Script (逐字课堂实录/教学实录与课堂用语脚本)** formatted as a modern, beautifully styled single-file HTML document.

---

## 1. Delivery Script Content & Structure Requirements

The script must be fully written out (verbatim) without summarizing or skipping dialogue (strictly avoid non-scripted summaries like *"Teacher explains the grammar rules..."* or *"Teacher leads a discussion..."*). Every teacher turn must be an exact, natural spoken utterance.

### Document Sections & Flow:

1. **Header & Metadata Banner**:
   - **Lesson Title (`<h1>`)**: e.g., `Unit 1 You and Me · Section A 课堂实录与教学用语脚本 (Classroom Delivery Script)`.
   - **Unit BIG Question**: Highlighted banner directly under `<h1>` (e.g., `❓ BIG Question: How do we make new friends? / How do we get to know each other?`).
   - **Lesson Metadata Grid**: Grade Level, Class Duration (45 mins), Class Type, and Core Target Competencies.

2. **Step-by-Step Delivery Sections (Steps 1–6)**:
   - **Stage Title & Time Interval** (e.g., `Step 1: Warm-Up & Lead-In (00:00 - 05:00)`).
   - **Micro Timestamps** (e.g., `[00:00 - 02:00] Greeting & Hook`, `[02:00 - 05:00] Checking Prior Knowledge`).
   - **Dialogue Cards**:
     - **Teacher (T)**: Exact spoken words with clear context.
     - **Stage Directions / Teacher Actions**: Marked in visual callout boxes or italicized badges (*[T points to the screen, plays audio, or writes on the blackboard]*).
     - **Expected Student Responses (Ss / S1 / S2)**: Realistic anticipated student responses and interactions.

3. **Standard Classroom English Categories (标准课堂用语标识)**:
   You MUST highlight and tag standard classroom English expressions across the script with designated CSS classes/badges:
   - 🟢 `[Greeting & Hook]` (日常问候与导入): e.g., *"Good morning, boys and girls! Welcome back! How are you doing today?"*
   - 🔵 `[Instruction & Directives]` (课堂指令与组织): e.g., *"Open your books to page 20.", "Look at the photo board.", "Eyes on me, please."*
   - 🟣 `[CFU - Checks for Understanding]` (理解检查与追问): e.g., *"Does everyone understand?", "What did you hear from the audio?", "Can you repeat that in a full sentence?"*
   - 🟡 `[Encouragement & Feedback]` (表扬、鼓励与即时反馈): e.g., *"Terrific job!", "10 points for Group 1!", "Spot on! That's a great observation."* (Use *points* rather than *stars*).
   - 🟠 `[Transition & Pacing]` (过渡与节奏把控): e.g., *"Now that we've gathered the information, let's move on to...", "Time is up, pens down."*
   - 🔴 `[📝 Student Task]` (学生活动与实践实操): e.g., Pair handshake greeting, dialogue role-play, student ID speed friending.

4. **Classroom Management, Blackboard Writing & Scaffolding Strategies**:
   - **No Standalone Blackboard Section**: Do NOT append a separate, static `.blackboard-section` at the end of the document.
   - **100% Blackboard Writing Coverage**: The delivery script MUST cover all blackboard writings (Title, Big Question, Group PK table, Vocabulary/Information Mindmaps, Grammar/Writing Scaffolds, Key Takeaways/Reading Plus Advice) chronologically inside `.action-box` with `.board-snippet` elements as the lesson unfolds in Steps 1–6.
   - Explicit scaffolding for lower-performing and higher-performing students.
   - Strict sequential numbering for all dialogue turns (`L01`, `L02`...) across all 6 steps.
   - Pacing & Compactness: Ensure each major step fits comfortably within its printed page boundary without overflowing lines.

---

## 2. Styling & HTML Technical Requirements

- **Single-file HTML**: Embed all CSS inside a `<style>` block in the `<head>`. Do not rely on external CSS/JS frameworks.
- **Clean Typography & Color Palette**:
  - CSS Variables for palette: Deep navy headers (`#1a365d`), subtle slate borders (`#cbd5e1`), soft backgrounds (`#f8fafc`).
  - Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`.
- **Visual Callout Tags for Classroom Language**:
  ```css
  .badge-tag {
    display: inline-block;
    padding: 1px 5px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 2px;
    margin-right: 3px;
    vertical-align: middle;
    line-height: 1.2;
  }
  .tag-greeting { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }    /* Greeting */
  .tag-directive { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }   /* Directive */
  .tag-cfu { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }         /* CFU */
  .tag-praise { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }      /* Praise */
  .tag-transition { background: #ffedd5; color: #9a3412; border: 1px solid #fed7aa; }  /* Transition */
  .tag-task { background: #fce7f3; color: #9d174d; border: 1px solid #fbcfe8; font-weight: 700; } /* Student Task */
  
  .board-snippet {
    display: inline-block;
    background: #f8fafc;
    border-left: 2.5px solid var(--accent-color);
    padding: 2px 6px;
    font-style: normal;
    color: var(--primary-color);
    font-weight: 600;
    font-size: 10.5px;
    border-radius: 0 2px 2px 0;
  }
  .action-box {
    background: #f8fafc;
    border-left: 2.5px solid var(--secondary-color);
    padding: 3px 6px;
    font-style: italic;
    font-size: 10.5px;
    color: #475569;
    margin: 2px 0;
    border-radius: 0 2px 2px 0;
  }
  ```
- **Print Friendly (`@media print`)**:
  - Clean borders, readable black text, hidden screen helper buttons, and clean page breaks for physical A4 printing (`margin: 8mm 16mm`).
- **Interactive UI Feature**: Include a top screen helper bar `.no-print-bar` with a 1-click print button (`window.print()`).

---

## 3. Lesson Metadata & Source Material

- **Subject / Grade Level:** [Insert Grade Level & Subject, e.g., Grade 7 English / 七年级英语]
- **Lesson Duration:** [Insert Time, e.g., 45 minutes / 1 class period]
- **Lesson Topic / Unit:** [Insert Topic Name, e.g., Unit 1 Section A - How do we get to know each other?]
- **Key Learning Objectives:**
  - [Objective 1]
  - [Objective 2]
  - [Objective 3]

- **Source Content / Textbook Text / Notes:**
  [Paste your textbook reading text, dialogue transcripts, grammar focus, vocabulary list, or lesson design notes here]
