# Test Sheet Design Notes

This document details the architecture, JSON schema, and interactive shell design for the textbook test sheets (quizzes) implemented in V2.

## 1. JSON Data Schema (`*-test.json`)

The test sheets are designed to support multiple structured question types grouped into sub-pages (sections) to mimic real-world school quiz paper sheets.

### Top-level Structure
```json
{
  "level": "Grade 5 Semester 2 - Unit 1-3",
  "title": "Word Magician Exercise Unit 1-3",
  "sections": [
    {
      "id": "s1",
      "title": "I. Read and choose",
      "instruction": "从方框中选择恰当单词填空，每词只用 1 次。",
      "type": "fill-in-the-blank-wordbank",
      "wordbank": ["pair", "building", "camp"],
      "questions": [
        {
          "id": "t_u13_1_1",
          "prompt": "I need to ______ some money for the book.",
          "answer": "pay",
          "translation": "我需要为这本书付一些钱。",
          "explanation": "pay some money for sth 意为“为某物付一些钱”。"
        }
      ]
    }
  ]
}
```

### Supported Section Types
1. **`fill-in-the-blank-wordbank`**
   - Users select words from a shared wordbank dropdown list.
   - Wordbank options dynamically display suffixes showing which question number currently uses each word (e.g. `pair (1)`).
2. **`fill-in-the-blank-firstletter`**
   - Free text input for spelling completion based on a starting letter (e.g. `The s______ day is Tuesday`).
3. **`multiple-choice`**
   - Standard choice question with an options array (index-based selection and answers).

---

## 2. Interactive Shell Design (`TestSheetShell`)

The shell component (`TestSheetShell.tsx`) provides a responsive, single-page exam application layout.

### Sub-paging & Navigation
- **Navigation Sidebar**: Left sidebar containing clickable tabs for each section.
- **Section Paging**: Footer controls only show a green **"Next Section"** button on non-final sub-pages. The **"Submit Test"** button is restricted to the final sub-page.
- **Auto-Scroll**: Every section change automatically and smoothly scrolls the viewport back to the top of the page.

### Attempt Limits
- **Daily Caps**: Students are limited to **5 attempts** per textbook test sheet per day.
- **Start Confirmation**: On load, a modal prompts: *"This is your X attempt today. You have a maximum of 5 attempts daily. Ready to go?"*.
- **Admin Reset**: If an active user holds the `admin` role, a green **"Reset Attempts (Admin)"** button appears on the lockout screen to wipe trials.

### Coin Rewards
- **Grading Boundaries**:
  - Score `< 70`: `0` coins rewarded.
  - Score `70 <= score < 90`: `1` coin.
  - Score `>= 90`: `2` coins.
- **Submit Modal**: Clicking **"Submit Test"** prompts a confirmation modal displaying: *"Scores of 70 to 89 earn 1 coin; scores of 90 and above earn 2 coins. Proceed to check?"*
- **Pet Integration**: Communicates directly with the `petService` and `PetFloatingCompanion` event dispatchers to award the exact coin counts and show corresponding animations only when coins are gained.

### UI & Styling Details
- **Text Align**: Input values align to the left to sit close to the starting letter clues.
- **Readability**: Inputs specify explicit background colors (`#ffffff`) and text colors (`#0f172a`) to ensure absolute readability across dark/light browser configurations.
