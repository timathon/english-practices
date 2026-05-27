# English Practices V2 (Frontend)

The modern interactive platform for English learning, built with React, TypeScript, and Vite.

## Features

- **Interactive Practices**: Native implementations of core exercise types:
    - ✅ **Vocab Master**: Shuffled quizzes with Cloze, En2Cn, and Cn2En modes.
    - ✅ **Recall Map**: Interactive mindmaps with progressive reveal and mobile vertical views.
    - ✅ **Vocab Guide**: Comprehensive study cards with natural scrolling and centered body layout.
    - ✅ **Spelling Hero**: Word assembling using linear chunks and soup-brick pools.
    - ✅ **Sentence Architect**: Syntax block builder with alternate grammatical options.
    - ✅ **Grammar Wizard**: Concepts and construction quizzes covering key language points.
    - ✅ **Text Navigator**: Reading mindmap structures with inline True/False statement validation.
- **Pet Companion System**:
    - **Local Companions**: Adopt a buddy (🐱 Cat, 🐶 Dog, or 🦖 Dino) and rename it.
    - **🔥 Streak Tracking**: Consecutive practice days are tracked with flame animations. Missing a day resets the streak.
    - **⭐ XP & 20-Level Progression**: +10 base XP per correct answer + streak bonus (up to +40). Levels span from 1 to 20.
    - **🎯 Daily Goals**: Three presets (Easy: 15, Normal: 30, Hard: 50) with SVG ring progress indicator and +50 XP bonus on completion.
    - **🐣 Pet Evolution**: Four visual stages — Baby (L1–4), Teen (L5–10), Adult (L11–17), Legendary (L18–20) — with stage-specific emoji and glow colors.
    - **🏆 15 Achievements**: Unlockable badges for streak milestones (3/7/14/30 days), level milestones (5/10/15/20), correct answer milestones (100/500/1000), daily goal milestones (3/10/30), and first feed. Toast notifications on unlock.
    - **Floating Companion**: Shows streak badge, daily progress ring, XP particles on correct answers, level-up glow animation, and confetti burst on daily goal completion.
    - **Practice Rewards**: Earn food points and love through correct answers. Feed and pet your companion on the dashboard.
- **User Dashboard**:
    - Natural numeric sorting for modules (M1, M2... M10).
    - Progress tracking with letter grades (S, A, B, C, F).
    - Daily activity tracking and usage analytics.
- **Admin Panel**:
    - **User Management**: Create student accounts and reset passwords.
    - **Access Control**: Grant specific textbook permissions per user.
    - **Subscription Management**: Set subscription expiry dates with quick-add shortcuts (+30, +180, +365 days).
    - **Usage Monitoring**: View student joined dates and access status.

## Pet Companion System Design

All pet state is client-side (no server dependency). The system uses the following design principles:

1. **State Persistence**: All state (hunger, love, inventory, streaks, XP, level, achievements, daily progress) is stored in `localStorage` under `ep-pet-state`. Old schemas are auto-migrated with sensible defaults.
2. **Lazy-Calculated Decay**: Natural hunger and love decay (at `0.5` points per hour) is calculated lazily on state-load. The pet decays even when the app is closed, but consumes zero background power.
3. **Event-Driven Synchronization**: Widgets (`PetDashboardWidget` and `PetFloatingCompanion`) sync via custom window events:
   - `ep-pet-update` — state changed (any field)
   - `ep-correct-answer` — correct answer with detail payload (xpGain, dailyProgress, streak, level, etc.)
   - `ep-achievement-unlock` — new achievement unlocked with definition payload
4. **Pacing Rules**:
   - **Correct Answer**: Awards `+0.1` Food Point and `+0.1` Love. Awards `+10` base XP `+ streak×2` bonus XP (capped at +40). 10 correct answers = 1 Food Item.
   - **Feeding**: Consumes `1.0` Food Item and restores `+10` Hunger. First feed unlocks the `first-feed` achievement.
   - **Petting**: Increases Love by `+2` points.
   - **Daily Goal**: When `dailyProgress` hits the preset target, awards a one-time `+50` XP bonus and increments `dailyGoalsCompleted`.
   - **Streaks**: First correct answer of the day updates `lastPracticeDate`. Consecutive days increment `streak`; gaps reset to 1.
5. **Level & Evolution**:
   - 20 levels with XP thresholds: `[0, 80, 200, 380, 620, 920, 1300, 1750, 2300, 2950, 3700, 4550, 5500, 6000, 6600, 7300, 8000, 8500, 9000, 9500]`.
   - Evolution stages: Baby (L1–4), Teen (L5–10), Adult (L11–17), Legendary (L18–20). Each stage changes pet emoji expressions and UI glow colors.
6. **Achievements**: 15 badges checked after each `awardCorrectAnswer()` call. Newly unlocked IDs are dispatched as events for toast notifications.

## Tech Stack

- **Framework**: React 19
- **Language**: TypeScript
- **Bundler**: Vite
- **Auth Client**: Better-Auth
- **Styling**: Vanilla CSS (Scoped component styles)
- **Charts**: Recharts

## Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file or ensure `VITE_API_URL` is set to your backend (default: `http://localhost:8787`).

3. **Run Dev Server**:
   ```bash
   npm run dev
   ```

## Deployment

Build the static assets:
```bash
npm run build
```
The output will be in the `dist` folder.
