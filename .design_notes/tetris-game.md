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
- If no free rotations are available, a vocab question modal overlay appears, temporarily slowing the falling block's speed to **10%** of the current level speed.
- Answering correctly rotates the block immediately and keeps the game moving.
- Answering incorrectly closes the modal, resumes normal gravity, and resets the combo streak without rotating.

### 3. Streak & Free Rotations
- **Streak Tracker**: Tracks consecutive correct answers up to 5 (represented by visual dots `●●●○○` in the sidebar).
- **Reward**: Reaching a streak of 5 awards the player **+5 Free Rotations** and resets the streak tracker.
- **Immediate Use**: Free rotations can be spent immediately using standard controls without prompting a vocabulary question. Spend activity triggers a brief `🔄 Free Rotation!` slide-in toast.
- **Celebration Toast**: A central, bouncing notification card celebrates reaching the 5-streak milestone.

### 4. Dual Timer Systems
- **Question Countdown (10s)**:
  - Displayed on the top-left of the question card.
  - Uses an SVG ring with a `conic-gradient` color arc shrinking over time (Green: 7-10s → Yellow: 4-6s → Red: 0-3s).
  - Reaching 0 auto-fails the question and resets the streak.
- **Game Time Limit (5m / 300s)**:
  - Active throughout gameplay.
  - Displays as `Time Left` in the statistics sidebar.
  - Starts pulsating and warning in red (`.time-critical`) when remaining time falls below 30 seconds.
  - Reaching 0 halts gameplay and launches the `⏰ Time Up!` screen.

### 5. Pet Service & Persistence
- Syncs rounds and cost tokens through `petService` (1 round decremented per game, unlocked using pet health/love and gold coins).
- High scores are saved to `/api/records` under the identifier `game-tetris` and trigger updates to the local leaderboard.

## Key Files

- [TetrisGame.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/TetrisGame.tsx) — Houses React game states, keyboard listeners, drop intervals, collision detection, and quiz verification.
- [TetrisGame.css](file:///home/timathon/codes/smartedu/english-practices/v2/src/components/TetrisGame.css) — Custom stylesheet containing board grid styling, glassmorphism UI overlays, streak dot indicators, conic timers, and celebratory toast animations.
