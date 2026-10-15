# End-to-End Guide: Adding a New Practice Type to V2

This document provides a comprehensive end-to-end blueprint for introducing a completely new practice type into the English Practices V2 system. It covers data modeling, rules definition, GenAI automation, backend API cataloging, database seeding, routing, frontend UI components, records tracking, and mistake notebook integration.

---

## 1. Specification & Data Schema (`GEMINI.md`)

Before writing code or generating exercises, document the practice rules and schema in [`GEMINI.md`](file:///home/timathon/codes/smartedu/english-practices/GEMINI.md).

### 1.1 Choose Practice Identification
- **Full Display Title**: E.g., `Grammar Guard`
- **Practice Slug / Type**: E.g., `grammar-guard`
- **Short Acronym**: E.g., `GG`
- **Target Filename Suffix**: E.g., `*-grammar-guard.json` (saved in `v2-data/<Textbook>/<unit>/`)

### 1.2 Define the JSON Schema
Document whether the practice is:
- **Challenge-based** (like `vocab-master`, `sentence-architect`, `grammar-wizard`, `grammar-guard`, `phonics-ninja`): contains top-level `challenges: [{ id, title, icon, questions: [...] }]`.
- **Section-based** (like `passage-decoder`, `audio-detective`): contains `sections: [{ title, sentences: [...] }]`.
- **Tree-based** (like `text-navigator`, `recall-map`): contains `tree: { id, text, cn, emoji, children }`.

#### Minimal Challenge-Based Schema Example:
```json
{
  "level": "Grade 4 Semester 1 - Unit 1",
  "title": "Grammar Guard",
  "storageSuffix": "_a4a_u1_gg",
  "challenges": [
    {
      "id": "c1",
      "title": "Verb Be: Basics 1",
      "category": "verb_be",
      "icon": "🛡️",
      "questions": [
        {
          "id": "gga4au1q01",
          "tn_id": "sp_s1",
          "prompt": "I ______ Terry Fox. I like running and playing basketball.",
          "options": ["is", "are", "am", "be"],
          "answer": 2,
          "explanation": "第一人称单数 I 作主语时，一般现在时系动词用 am。",
          "hint": "注意主语是第一人称单数 I。"
        }
      ]
    },
    {
      "id": "c3",
      "title": "Yes/No Questions: Basics 1",
      "category": "yes_no_question",
      "icon": "❓",
      "questions": [
        {
          "id": "gga4au1q21",
          "tn_id": "gr_v1_s1",
          "prompt": "将陈述句转换为一般疑问句：\nI can run and swim.",
          "options": [
            "Can you run and swim?",
            "Do you run and swim?",
            "Are you run and swim?",
            "Does you run and swim?"
          ],
          "answer": 0,
          "explanation": "含有情态动词 can 的陈述句变一般疑问句时，将 Can 提到句首，第一人称 I 改为 you。",
          "hint": "含有情态动词 can，把 can 提前，I 变为 you。"
        }
      ]
    }
  ]
}
```

> [!IMPORTANT]
> **Strictly Unique Question IDs Rule**:
> Every question must have a unique `id` across the entire JSON file. Never reuse IDs across challenges to prevent React duplicate-key warnings and mistake notebook collisions.

---

## 2. GenAI Automation Script (`scripts/genai/`)

Create a script in `scripts/genai/` (e.g. `gen_13_gg.py`) to generate the practice JSON automatically from the unit markdown or text navigator.

### Essential Structure of a GenAI Script:
1. **Inputs**: Unit markdown file (`<unit>.md`) or dependent JSON (e.g., `<unit>-text-navigator.json`).
2. **Context Assembly**: Extract sentences, vocabulary, or pronunciation targets from the input files.
3. **Prompt Definition**: Include rules, exact JSON schema, and strict output constraint (`Output ONLY valid JSON, no markdown fences`).
4. **Gemini API Call**:
   ```python
   from config import get_genai_config, parse_high_flag
   api_key, model_name = get_genai_config(parse_high_flag())
   client = genai.Client(api_key=api_key)
   response = client.models.generate_content(
       model=model_name,
       contents=prompt,
       config=types.GenerateContentConfig(
           thinking_config=types.ThinkingConfig(thinking_level="minimal"),
           temperature=0.2,
           response_mime_type="application/json"
       )
   )
   ```
5. **Post-Processing & Validation**:
   - Sanitize and format unique IDs (e.g., prefix + unit code + 2-digit index).
   - Randomize answer positions if needed.
   - Save to `<unit>-<practice-slug>.json`.

---

## 3. Database Seeding & Audio Generation

### 3.1 Register in Seed Script (`scripts/seed_practices.cjs`)
When seeding JSON files to SQLite / Cloudflare D1, `scripts/seed_practices.cjs` matches filenames against `knownTypes`.

In [`scripts/seed_practices.cjs`](file:///home/timathon/codes/smartedu/english-practices/scripts/seed_practices.cjs):
```js
const knownTypes = [
    'vocab-guide',
    'vocab-master',
    'spelling-hero',
    'phonics-ninja',
    'sentence-architect',
    'recall-map',
    'grammar-wizard',
    'grammar-guard', // <-- Register new type slug here
    'passage-decoder',
    'audio-detective',
    'text-navigator',
    'writing-map',
    'test',
    'bug-hunter',
    'passage-cloze',
    'grammar-index'
];
```

### 3.2 Seed to Database
Run the seed script:
```bash
# Seed a specific unit JSON:
npm run seed-v2 v2-data/A4A/a4a-u4/a4a-u4-grammar-guard.json

# Or bulk seed an entire textbook:
npm run seed-v2 v2-data/A4A/
```
*(Seeding automatically purges the KV cached catalog on Cloudflare).*

### 3.3 Audio Generation (If Applicable)
If the new practice includes English sentences or vocabulary not yet generated:
```bash
node scripts/tts-in-one.cjs <path-to-json>
```

---

## 4. Backend Cloudflare Worker API (`v2-api/`)

The Dashboard fetches `/api/practices` to populate textbook unit menus. To avoid 10MB+ payload bottlenecks, `v2-api` creates a pruned `lightContent` summary for every practice.

### 4.1 Update `lightContent` Extractor in [`v2-api/src/index.ts`](file:///home/timathon/codes/smartedu/english-practices/v2-api/src/index.ts)
Around line 666:
```ts
if (content) {
    if (
        type.includes('vocab-master') ||
        type.includes('sentence-architect') ||
        type.includes('grammar-wizard') ||
        type.includes('grammar-guard') ||     // <-- Add your new challenge-based type
        type.includes('phonics-ninja') ||
        type.includes('phonics')
    ) {
        const challenges = content.challenges || [];
        lightContent = {
            challenges: challenges.map((c: any) => ({ title: c.title || '' }))
        };
    } else if (type.includes('passage-decoder') || type.includes('audio-detective')) {
        const sections = content.sections || [];
        lightContent = {
            sections: sections.map((s: any) => ({ title: s.title || '' }))
        };
    }
    // ...
}
```

### 4.2 Backend Records Contracts (Critical Gotcha)
When the frontend interacts with `/api/records`:
- **`GET /api/records`**: Returns a raw array of records `Record[]` (NOT `{ success: true, data: [...] }`).
- **`POST /api/records`**: Returns `{ success: true, id: string }` (The ID is at `j.id`, NOT `j.data.id`!).
- **`PUT /api/records/:id`**: Accepts `{ unit, score, unfinished, answers }` and returns `{ success: true }`.

### 4.3 Deploy Worker
```bash
cd v2-api
npx wrangler deploy --minify
```

---

## 5. Frontend Shell & Navigation (`v2/src/`)

### 5.1 Naming, Translation & Icons ([`v2/src/lib/dashboardUtils.ts`](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/dashboardUtils.ts))
1. **Add Chinese Translation**:
   ```ts
   export function translatePracticeName(name: string): string {
       // ...
       if (n.includes('grammar guard')) return '语法守卫' + suffix;
       // ...
   }
   ```
2. **Add Icon**:
   ```ts
   export const PRACTICE_TYPE_ICONS: Record<string, string> = {
       // ...
       'grammar-guard': '🛡️',
   };
   ```

### 5.2 Build the Interactive Shell ([`v2/src/components/*Shell.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/))
Create the dedicated shell component (e.g. `GrammarGuardShell.tsx`) using shared shell building blocks:
- [`ShellHeader`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ShellHeader.tsx): Back button, title, audio controls, invisible mode toggle.
- [`ActiveHeader`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ActiveHeader.tsx): Progress indicators, countdown timer, close confirmation.
- [`ChallengeCardGrid`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/ChallengeCardGrid.tsx): Card grid displaying today/lifetime runs and best scores.
- [`FooterAction`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/FooterAction.tsx): "Check" and "Continue" buttons with keyboard shortcuts (`Enter`).
- [`QuestionReviewList`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/QuestionReviewList.tsx): Summary list of questions answered on completion screen.
- [`CompleteScreenActions`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/shell/CompleteScreenActions.tsx): "Try Again" and "Back to Grid" buttons with trial tracking.

#### Practice Record & Cache Sync Pattern (Required):
```ts
// 1. Loading Records
const loadRecords = async () => {
    try {
        const cached = cache.getRecords();
        if (cached) setPracticeRecords(cached);
        const res = await fetch(`${API_URL}/api/records`, { credentials: 'include' });
        const json = await res.json();
        if (Array.isArray(json)) {
            cache.setRecords(json);
            setPracticeRecords(json);
        }
    } catch (e) {
        console.error('Failed to load records:', e);
    }
};

// 2. Syncing Records (POST on first start, PUT on question update & complete)
const syncRecord = async (scorePercent: number, isFinished: boolean) => {
    // Save to server with unit key: `${practiceId} (${activeChallenge.title})`
    // Ensure j.id is handled properly on POST:
    if (j.success && j.id) {
        setActiveRecordId(j.id);
        cache.updateRecord({
            id: j.id,
            unit: `${practiceId} (${activeChallenge.title})`,
            score: scorePercent,
            unfinished: !isFinished,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as any);
    }
    // Update local React state immediately so stats and cards update:
    setPracticeRecords(cache.getRecords() || []);
};
```

### 5.3 Mistake Notebook Integration (`mistakeService`)
On wrong answers, record the mistake so it appears in the student's mistake notebook:
```ts
if (!isCorrect && userId && !invisibleMode) {
    mistakeService.addMistake(userId, {
        practiceId,
        textbook,
        unit,
        practiceType: 'grammar-guard', // your practice slug
        question: {
            ...q,
            category: activeChallenge?.category || 'grammar',
            en: q.prompt,
            cn: q.explanation || ''
        },
        wrongAnswer: selectedOptionText
    });
    mistakeService.syncToServer(userId);
}
```

Support review mode in the shell when `location.state?.mode === 'mistake-review'` or `mistakeMode` prop is present.

### 5.4 Shell Routing ([`v2/src/components/PracticeShell.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/PracticeShell.tsx))
Mount your shell inside `PracticeShell.tsx`:
```tsx
import { GrammarGuardShell } from './GrammarGuardShell';

// Inside render logic:
if (practiceType.includes('grammar-guard')) {
    return <GrammarGuardShell data={practiceData} practiceId={id} unit={unit} textbook={textbook} />;
}
```

---

## 6. Dashboard Display & Stats Badges (`BookSection.tsx`)

In [`v2/src/components/dashboard/BookSection.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/BookSection.tsx):

1. **Group Assignment**:
   Filter and group the new practice into one of the practice categories (e.g., Sentence & Grammar, Vocabulary, Phonics & Listening, or Reading):
   ```tsx
   const grammarGuardItems = items
       .filter((p: any) => p.type.toLowerCase().includes('grammar-guard'))
       .sort((a: any, b: any) => a.title.localeCompare(b.title));
   ```
2. **Icon Fallback**:
   In `getIcon(p.type)`:
   ```tsx
   if (t.includes('grammar-guard')) return '🛡️';
   ```
3. **Stat Calculation Flag**:
   In `calculateProgress()` / challenge stats block:
   ```tsx
   const isGG = p.type.toLowerCase().includes('grammar-guard');

   if ((isVM || isSA || isGW || isGG || isPN) && p.content?.challenges) {
       total = p.content.challenges.length;
       let sumMax = 0;
       for (const chal of p.content.challenges) {
           const chalRecords = records.filter((r: any) => r.unit === `${p.id} (${chal.title})` && !r.unfinished);
           if (chalRecords.length > 0) {
               doneCount++;
               sumMax += Math.max(...chalRecords.map((r: any) => r.score));
           }
       }
       if (doneCount > 0) avg = Math.round(sumMax / doneCount);
   }
   ```
4. **Badge Render Condition**:
   Include `isGG` in the badge condition to display the `doneCount/total` progress fraction and `S/A/B/C/F` letter-grade pill:
   ```tsx
   {(isVM || isSH || isPN || isSA || isGW || isGG || isPD || isAD || isTN) && total > 0 && (
       <div style={{ ... }}>
           {/* Progress Badge */}
       </div>
   )}
   ```

---

## 7. Mistake Notebook Rendering (`MistakeBookView.tsx`)

In [`v2/src/components/dashboard/MistakeBookView.tsx`](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/dashboard/MistakeBookView.tsx):
1. Add the practice type label and badge styling in `practiceTypeLabels`:
   ```ts
   'grammar-guard': { label: '语法守卫', color: '#0284c7' }
   ```
2. Handle the question display format (prompt with blanks, correct answer, student wrong answer) so mistake review cards render accurately.

> [!NOTE]
> Some guided multi-step pedagogical practices (such as `Reading & Expression / YB`) deliberately opt out of recording mistakes into `mistakeService` because intermediate incorrect assembly attempts are handled in-situ as guided steps rather than standalone single-word vocabulary/grammar mistake notebook entries. In such cases, omit `mistakeService.addMistake()` in the shell.

---

## 8. Verification & Deployment Lifecycle

Follow this exact sequence to verify and deploy:

```text
1. [Schema in GEMINI.md]         → Verify: Section added with JSON template
2. [GenAI Script]                → Verify: Run `python3 scripts/genai/gen_<slug>.py <unit.md>`
3. [Seed Practice]               → Verify: Run `npm run seed-v2 <path.json>`
4. [Backend lightContent]        → Verify: Run `cd v2-api && npm run deploy`
5. [Frontend Build]              → Verify: Run `cd v2 && npm run build`
6. [Interactive Testing]         → Verify: Complete 1 challenge in browser:
                                    - Challenge card updates to "1 Runs | Best: XX%"
                                    - Dashboard badge updates from "0/N" to "1/N" with grade pill
                                    - Intentional errors appear in Mistake Notebook
```
