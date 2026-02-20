# Sentence Exercise Manager

A single-page web application for creating, managing, and practicing English sentence-building exercises.

## Overview

This app helps English learners practice sentence construction through interactive exercises. Users can create custom challenges from JSON data or generate AI prompts to create exercises automatically.

## Features

### 1. Generate Prompt

Create an AI-ready prompt from English sentences.

- **Input**: Paste English sentences (one per line, or multiple sentences per line separated by punctuation)
- **Sentence Splitting**: 
  - Lines are split by newlines
  - Each line is further split by sentence-ending punctuation (`.`, `!`, `?`) followed by a space
  - Example: `"My favourite festival is the Spring Festival. It is the most important festival in China."` becomes two separate sentences
- **Output**: A formatted prompt ready to paste into AI chatbots (ChatGPT, Claude, etc.)
- **Process**:
  1. Enter English sentences
  2. Click "Generate AI Prompt"
  3. Copy the generated prompt
  4. Paste into AI chatbot to receive JSON exercise data

### 2. Paste JSON

Create a new challenge from JSON exercise data.

- **Input Fields**:
  - Challenge title (e.g., "Unit 1: Healthy Food")
  - Icon emoji (e.g., "🍽️")
  - JSON array of exercises
- **JSON Format**:
  ```json
  [
    {
      "en": "English sentence",
      "cn": "中文翻译",
      "hint": "Grammar hint / 语法提示",
      "noise": ["distractor", "words"],
      "accept": ["alternative answers"]
    }
  ]
  ```
- **Actions**:
  - "Create Challenge" - Save as new challenge

### 3. My Challenges

View and manage all created challenges.

- **Display**: Cards sorted by creation date (newest first)
- **Card Information**:
  - Title with creation date (e.g., "Unit 1 (2026/2/20)")
  - Icon emoji
  - Number of sentences
  - Practice sessions count
  - Best score percentage
- **Actions per Challenge**:
  - **Practice** - Start immersive practice session
  - **Edit** - Modify challenge data
  - **Delete** - Remove challenge (with confirmation)

### 4. Statistics

Track learning progress across all challenges.

- **Stats Cards**:
  - Total Challenges
  - Practice Sessions
  - Average Score (%)
  - Best Score (%)
- **Recent Sessions**: List of last 20 practice sessions with:
  - Challenge name
  - Score (correct/total)
  - Date/time
  - Percentage with color coding:
    - Green (≥80%): Excellent
    - Yellow (60-79%): Good
    - Red (<60%): Needs work
- **Action**: Clear Statistics (does not delete challenges)

### 5. Export

Export challenges as JSON for backup or sharing.

- **Content**: Challenges only (no statistics)
- **Action**: "📋 Copy Content" - Copies JSON to clipboard
- **Feedback**: Button shows "✓ Copied!" for 2 seconds

### 6. Import

Import previously exported challenges.

- **Input**: Paste exported JSON content
- **Warning**: Replaces all existing challenges (stats preserved)
- **Validation**: Checks for required fields (id, title, exercises)
- **Action**: "📥 Import Data" - Import challenges to localStorage

## Immersive Practice Mode

Full-screen practice interface for focused learning.

### UI Elements

- **Header**:
  - Back button (←) - Returns to challenges list
  - Progress bar - Shows current position in exercise queue
- **Question Area**:
  - Chinese prompt (中文)
  - Hint button (💡) - Reveals grammar hint
  - Answer area - Selected words appear here
  - Word pool - Clickable word buttons
- **Footer**:
  - Check button - Validate answer
  - Continue button - Next question
  - Done button - Finish session

### Interaction Flow

1. **Select Challenge** → Opens immersive mode
2. **Build Sentence**:
   - Click words from word pool → Added to answer area
   - Click answer words → Return to word pool
   - Selected words become invisible (space preserved)
3. **Check Answer**:
   - Correct → Green feedback, +1 score
   - Wrong → Red feedback, shows correct answer
4. **Continue** → Next question
5. **Complete** → Shows final score percentage
6. **Exit**:
   - Finished → Click "Done", returns to challenges
   - Incomplete → Confirmation alert ("Progress will be lost")

### Scoring

- **Session Score**: Correct answers / Total sentences
- **Best Score**: Highest percentage per challenge (saved)
- **Session History**: Last 100 sessions stored

## Data Storage

All data stored in browser localStorage.

### Keys

- `sentence_exercises_challenges` - Array of challenge objects
- `sentence_exercises_stats` - Sessions and best scores
- `sentence_exercises_mistakes` - Mistake records for review

### Data Structure

```javascript
// Challenge
{
  id: "challenge_1234567890",
  title: "Unit 1: Healthy Food",
  icon: "🍽️",
  exercises: [...],
  createdAt: "2026-02-20T10:30:00.000Z"
}

// Stats
{
  sessions: [
    {
      challengeId: "challenge_1234567890",
      challengeTitle: "Unit 1: Healthy Food",
      date: "2026-02-20T11:00:00.000Z",
      total: 10,
      correct: 8,
      percentage: 80
    }
  ],
  bestScores: {
    "challenge_1234567890": 80
  }
}

// Mistake
{
  challengeId: "challenge_1234567890",
  challengeTitle: "Unit 1: Healthy Food",
  exerciseIndex: 3,
  exercise: {...},
  userAnswer: "I wants noodles",
  correctAnswer: "I want noodles",
  date: "2026-02-20T11:05:00.000Z"
}
```

## Technical Details

### File Structure

```
my-exercises/
├── my-sentence-exercises.html  # Single-file app (HTML + CSS + JS)
└── README.md                   # This specification
```

### Dependencies

- None (vanilla HTML, CSS, JavaScript)
- No external libraries or frameworks

### Browser Support

- Modern browsers with localStorage support
- Responsive design (mobile + desktop)
- Desktop: Centered card layout (max-width 600px practice mode)
- Mobile: Full-screen immersive mode

### CSS Variables

```css
--primary: #58cc02     /* Green - main actions */
--primary-dark: #46a302
--secondary: #1cb0f6   /* Blue - secondary actions */
--secondary-dark: #1185ba
--warning: #ffc800     /* Yellow - hints, current */
--warning-dark: #e5b400
--danger: #ff4b4b      /* Red - errors, delete */
--danger-dark: #d33131
--neutral: #e5e5e5     /* Gray - borders, inactive */
--text: #4b4b4b        /* Dark gray - text */
--white: #ffffff
--bg: #f0f2f5          /* Light gray - background */
```

### Navigation Tabs

1. Generate Prompt
2. Paste JSON
3. My Challenges (default view)
4. Statistics
5. Export
6. Import

### Home Button

- 🏠 emoji in header (top-left)
- Links to `../index.html` (root practices index)
- Hover effect: Scale 1.1x

## Usage Workflow

### Creating a Challenge (AI-assisted)

1. Go to "Generate Prompt" tab
2. Paste English sentences (one per line)
3. Click "Generate AI Prompt"
4. Copy the generated prompt
5. Paste into ChatGPT/Claude
6. Copy the JSON response
7. Go to "Paste JSON" tab
8. Enter title and icon
9. Paste JSON
10. Click "Create Challenge"

### Creating a Challenge (Manual)

1. Go to "Paste JSON" tab
2. Enter title and icon
3. Paste prepared JSON array
4. Click "Create Challenge"

### Practicing

1. Go to "My Challenges" tab
2. Find desired challenge
3. Click "Practice" button
4. Complete all sentences
5. View final score
6. Click "Done" to return

### Backing Up

1. Go to "Export" tab
2. Click "📋 Copy Content"
3. Paste into a text file
4. Save for backup/sharing

### Restoring

1. Go to "Import" tab
2. Paste exported JSON
3. Click "📥 Import Data"
4. Confirm replacement warning

## Design Principles

1. **Duolingo-inspired UI** - Familiar, gamified interface
2. **Mobile-first** - Touch-friendly buttons, responsive layout
3. **Immersive practice** - Full-screen focus mode
4. **Data persistence** - All progress saved locally
5. **AI-ready** - Easy integration with AI chatbots
6. **Single-file** - No build process, easy deployment
