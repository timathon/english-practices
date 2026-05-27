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
    - **Local Companions**: Adopt a cute buddy (🐱 Cat, 🐶 Dog, or 🦖 Dino) and rename it.
    - **Bilingual Face Tooltips**: Interacting (feeding/petting) triggers speech bubbles pointing directly to the pet's face.
    - **Practice Rewards**: Earn fractions of food points and love points through correct answers.
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

To keep the client-side resource footprint minimal and execution completely server-independent, the system uses the following design principles:

1. **State Persistence**: All state variables (Hunger, Love, Inventory, Lifetime Correct) are stored in client `localStorage` under `ep-pet-state`.
2. **Lazy-Calculated Decay**: Instead of background worker threads or active interval loops, natural hunger and love decay (at `0.5` points per hour) are calculated lazily on state-load. This means the pet decays even when the app is closed, but consumes zero background power.
3. **Decoupled Event-Driven Synchronization**: Component widgets (`PetDashboardWidget` and `PetFloatingCompanion`) are completely decoupled. They synchronize state in real time by dispatching and listening to a custom window event (`ep-pet-update`).
4. **Pacing Rules**:
   - **Correct Answer**: Awards `+0.1` Food Point ( drumstick fraction) and `+0.1` Love. Answering 10 questions correct yields exactly `1.0` Food Item.
   - **Feeding**: Consumes `1.0` Food Item and restores `+10` Hunger.
   - **Petting**: Increases Love by `+2` points.
   - **Speech Feedback**: Renders speech balloons pointing to the pet face on petting/feeding, which automatically clear after 4 seconds.

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
