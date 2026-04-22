# English Practices V2 (Frontend)

The modern interactive platform for English learning, built with React, TypeScript, and Vite.

## Features

- **Interactive Practices**: Supports various exercise types (Vocab Master, Spelling Hero, Sentence Architect, etc.).
- **User Dashboard**: Students can view and access their assigned textbooks.
- **Admin Panel**:
    - **User Management**: Create student accounts and reset passwords.
    - **Access Control**: Grant specific textbook permissions per user.
    - **Subscription Management**: Set subscription expiry dates with quick-add shortcuts (+30, +180, +365 days).
    - **Usage Monitoring**: View student joined dates and access status.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Bundler**: Vite
- **Auth Client**: Better-Auth
- **Styling**: Vanilla CSS

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
