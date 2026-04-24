# English Practices V2 (Frontend)

The modern interactive platform for English learning, built with React, TypeScript, and Vite.

## Features

- **Interactive Practices**: Native implementations of core exercise types:
    - ✅ **Vocab Master**: Shuffled quizzes with Cloze, En2Cn, and Cn2En modes.
    - ✅ **Recall Map**: Interactive mindmaps with progressive reveal and mobile vertical views.
    - ✅ **Vocab Guide**: Comprehensive study cards with natural scrolling and centered body layout.
    - 🚧 *Upcoming*: Spelling Hero, Sentence Architect.
- **User Dashboard**:
    - Natural numeric sorting for modules (M1, M2... M10).
    - Progress tracking with letter grades (S, A, B, C, F).
    - Daily activity tracking and usage analytics.
- **Admin Panel**:
    - **User Management**: Create student accounts and reset passwords.
    - **Access Control**: Grant specific textbook permissions per user.
    - **Subscription Management**: Set subscription expiry dates with quick-add shortcuts (+30, +180, +365 days).
    - **Usage Monitoring**: View student joined dates and access status.

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
