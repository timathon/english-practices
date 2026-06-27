# Proposal: Interactive English Practice Types for Chinese Senior High School (SA1)

To fully address the learning objectives of the Chinese senior high school English curriculum (using **Unit 1: Teenage Life** as a reference) without requiring typing, we can introduce four new interactive practice types. These focus on morphology (word-building), syntax (phrases and functions), text structure (discourse analysis), and phonics sorting.

---

## 1. Word Alchemist (Morphology & Collocation)
High school textbooks place significant emphasis on **word families** (derivation), **compound words**, and **preposition collocations**.

### Gameplay Mechanics (No Typing)
* **Compound Builder**: The screen displays a grid of prefixes, suffixes, or root words. The user taps two or more blocks to "fuse" them into compound words (e.g., `extra` + `curricular` = `extra-curricular`).
* **Word Family Matcher**: Drag-and-drop or select-to-match roots to their parts of speech (Noun/Verb/Adjective/Adverb) under speed challenge or sorting bins.
* **Collocation Connector**: A matching line or slot game where verbs/adjectives are paired with their correct prepositions (e.g., `attracted` ➔ `to`, `responsible` ➔ `for`).

### JSON Schema Example (`*-word-alchemist.json`)
```json
{
  "level": "Senior High 1 Semester 1 - Unit 1",
  "title": "Word Alchemist",
  "compounds": [
    {
      "parts": ["extra", "curricular"],
      "correct": "extra-curricular",
      "distractors": ["curriculum", "ordinary"]
    }
  ],
  "word_families": [
    {
      "root": "confuse",
      "verb": "confuse",
      "noun": "confusion",
      "adjective_ing": "confusing",
      "adjective_ed": "confused"
    }
  ],
  "collocations": [
    {
      "base": "addicted",
      "preposition": "to",
      "distractors": ["on", "for", "with"],
      "context": "He is addicted ____ Internet games."
    }
  ]
}
```

---

## 2. Syntax Sandbox (Phrases & Functions)
Chinese high school curriculum explicitly tests **Noun Phrases (NP)**, **Adjective Phrases (AdjP)**, and **Adverb Phrases (AdvP)**, along with their syntactic functions (Subject, Object, Predicative, Attribute, Adverbial) and internal ordering (e.g., adjective ordering).

### Gameplay Mechanics (No Typing)
* **Phrase Identifier**: A sentence is shown with underlined segments. The user classifies them into `NP`, `AdjP`, or `AdvP` by clicking category buttons.
* **Function Matcher**: Drag a highlighted phrase to its structural role (e.g., "very important" in "plays a *very important* part" ➔ Attribute/定语).
* **Adjective Order Trainer**: A slot-filling exercise where the user taps adjectives in the correct sequence (e.g., Opinion ➔ Size ➔ Color: `cute` ➔ `small` ➔ `white` ➔ `cat`).

### JSON Schema Example (`*-syntax-sandbox.json`)
```json
{
  "level": "Senior High 1 Semester 1 - Unit 1",
  "title": "Syntax Sandbox",
  "phrase_classification": [
    {
      "sentence": "The kids over there are putting something on a round paper plate.",
      "target": "a round paper plate",
      "correct_type": "NP",
      "options": ["NP", "AdjP", "AdvP"],
      "explanation": "'a round paper plate' is a noun phrase with 'plate' as the head word."
    }
  ],
  "function_mapping": [
    {
      "sentence": "Martin did not enjoy pop music until he became a teenager.",
      "target": "until he became a teenager",
      "function": "Adverbial (状语)",
      "options": ["Subject", "Object", "Attribute", "Adverbial", "Predicative"]
    }
  ],
  "adjective_ordering": [
    {
      "nouns": "cat",
      "adjectives": ["cute", "small", "white"],
      "correct_order": [0, 1, 2],
      "explanation": "Adjective order: Opinion (cute) -> Size (small) -> Color (white)."
    }
  ]
}
```

---

## 3. Discourse Navigator (Text & Genre Structure)
High schoolers must learn to analyze **paragraph structures**, **logical flows**, and **genre conventions** (like formal email outlines or advice letters).

### Gameplay Mechanics (No Typing)
* **Main Idea Outline Puzzle**: Match paragraph headers/summaries to the paragraph numbers through a simple drag-and-drop or select-and-link mechanism.
* **Advice Letter Structurer**: Color-code sentences in a sample letter to show their structural role:
  * **Green**: Grievance/Empathy ("I understand you are anxious...")
  * **Blue**: Suggestion ("I recommend you talk to him...")
  * **Orange**: Reasons & Outcomes ("Because playing too much is unhealthy...")
* **Logical Connector Sort**: Select the best logical transition (e.g., *However*, *Therefore*, *In addition*) from a pool of option cards to link two paragraphs/sentences.

### JSON Schema Example (`*-discourse-navigator.json`)
```json
{
  "level": "Senior High 1 Semester 1 - Unit 1",
  "title": "Discourse Navigator",
  "letter_structure": {
    "sections": [
      {
        "text": "Dear Worried Friend,",
        "role": "Greeting"
      },
      {
        "text": "I understand quite well that you are anxious and feel terrible.",
        "role": "Empathy"
      },
      {
        "text": "I recommend that you talk to your friend about his behaviour.",
        "role": "Recommendation"
      }
    ],
    "roles": ["Greeting", "Empathy", "Recommendation", "Reason", "Closing"]
  }
}
```

---

## 4. Phonics Gym (Sound Classifiers)
High school texts drill advanced pronunciation patterns and phonetic differences between letter combinations (e.g., `or` sounding like /ɔː/ in *horse* vs /ɜː/ in *word*).

### Gameplay Mechanics (No Typing)
* **Acoustic Sorting**: Sort falling word cards into separate bins corresponding to their vowel digraph pronunciations. (e.g., Sound bin 1: /ɜː/ for `work`, `burn`; Sound bin 2: /ɔː/ for `horse`, `more`).

### JSON Schema Example (`*-phonics-gym.json`)
```json
{
  "level": "Senior High 1 Semester 1 - Unit 1",
  "title": "Phonics Gym",
  "challenges": [
    {
      "categories": [
        { "id": "sound_er", "symbol": "/ɜː/", "description": "e.g. work, burn" },
        { "id": "sound_or", "symbol": "/ɔː/", "description": "e.g. horse, more" }
      ],
      "words": [
        { "word": "word", "category_id": "sound_er" },
        { "word": "hurt", "category_id": "sound_er" },
        { "word": "prefer", "category_id": "sound_er" },
        { "word": "bored", "category_id": "sound_or" },
        { "word": "absorb", "category_id": "sound_or" }
      ]
    }
  ]
}
```
