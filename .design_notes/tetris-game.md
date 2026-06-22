# Tetris Vocab Game — Design Notes

## Overview

A premium, gamified vocabulary practice tool integrated into the Game Center. It combines standard Tetris gameplay with active retrieval practice: moving blocks sideways or soft-dropping is free, but rotating a block requires answering an English-to-Chinese or Chinese-to-English vocabulary question.

## Core Features & Mechanics

### 1. Unit Lottery Selection
- Before gameplay begins, players participate in a "Unit Lottery" (styled like a slot-machine randomizer).
- It spins through available vocabulary guides (textbook units) and lands on one.
- That unit's vocabulary list becomes the active word-pool for the game.
- Participation costs `1 Tetris play round` from the pet service.

### 2. Quiz-Based Rotation
- Standard horizontal movements (`ArrowLeft`, `ArrowRight`) and soft drops (`ArrowDown`) are performed instantly.
- Pressing `ArrowUp`, `Space`, or clicking the mobile `🔄` button requests a rotation.
- If no free rotations are available, a vocab question modal overlay appears, temporarily slowing the falling block's speed to **0.2x** (5x slower drop interval) of the current level speed.
- Answering correctly rotates the block immediately and keeps the game moving.
- Answering incorrectly closes the modal, resumes normal gravity, and resets the combo streak without rotating.

### 3. Audio Pronunciation Feedback
- Immediately upon answering/selecting a choice, the audio of the vocabulary item (`question.word`) is played.
- Pronunciation is fetched from R2 cache storage (UK/US standard or MeloTTS depending on unit settings) using MD5 hashing, with standard Web Speech Synthesis (`window.speechSynthesis`) as a fallback if the audio file or network is unavailable.
- Audio is pre-fetched asynchronously when the question is generated, ensuring zero-latency playback upon clicking/keyboard selection.

### 4. Streak & Free Rotations
- **Streak Tracker**: Tracks consecutive correct answers up to 5 (represented by visual dots `●●●○○` in the sidebar).
- **Reward**: Reaching a streak of 5 awards the player **+5 Free Rotations** and resets the streak tracker.
- **Immediate Use**: Free rotations can be spent immediately using standard controls without prompting a vocabulary question. Spend activity triggers a brief `🔄 Free Rotation!` slide-in toast.
- **Celebration/Notification Placement**: High-streak celebrations (5 in a row) and free rotation indicator alerts are displayed inline directly under the `tetris-next-card` preview in the sidebar.

### 5. Dual Timer Systems
- **Question Countdown (10s)**:
  - Displayed on the top-left of the question card.
  - Uses an SVG ring with a `conic-gradient` color arc shrinking over time (Green: 7-10s → Yellow: 4-6s → Red: 0-3s).
  - Reaching 0 auto-fails the question and resets the streak.
- **Game Time Limit (5m / 300s)**:
  - Active throughout gameplay.
  - Displays as `Time Left` in the statistics sidebar.
  - Starts pulsating and warning in red (`.time-critical`) when remaining time falls below 30 seconds.
  - Reaching 0 halts gameplay and launches the `⏰ Time Up!` screen.

### 6. Pet Service & Persistence
- Syncs rounds and cost tokens through `petService` (1 round decremented per game, unlocked using pet health/love and gold coins).
- High scores are saved to `/api/records` under the identifier `game-tetris` and trigger updates to the local leaderboard.

### 7. Layout & Visibility Improvements
- **Stretched Sidebar**: The `.tetris-side-panel` is configured with `align-self: stretch` to match the exact height of the game board.
- **Admin Pause Button**: Positioned at the bottom of the `.tetris-side-panel` using `marginTop: 'auto'`, placing it at the bottom-right of the active gameplay row.
- **Leaderboard Visibility**: The leaderboard panel is hidden dynamically while the game is actively playing (`isPlaying === true`) to maximize focus, and is displayed once the game is over.
- **Leaderboard Highlights**: The row representing the user's latest game score is highlighted in purple with a border indicator to clearly track their standing.

## Key Files

- [TetrisGame.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/TetrisGame.tsx) — Houses React game states, keyboard listeners, drop intervals, collision detection, and quiz verification.
- [TetrisGame.css](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/TetrisGame.css) — Custom stylesheet containing board grid styling, glassmorphism UI overlays, streak dot indicators, conic timers, and celebratory toast animations.
