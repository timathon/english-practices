# English Practices V2 (Backend API)

High-performance serverless API built with Hono and Cloudflare Workers.

## Features

- **Authentication**: Powered by `Better-Auth` with support for email/password and usernames.
- **Admin Endpoints**: Secure management of users, practices, and textbook access.
- **Database Integrity**: Automatic cleanup of sessions, accounts, and practice records when a user is deleted.
- **Subscription Enforcement**: API-level validation of subscription expiry dates.
- **Shadow Hashing**: Specialized logic for handling legacy credentials and secure password transitions.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **ORM**: Drizzle ORM
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Better-Auth

## Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Database Migrations**:
   Generate and apply migrations to your local D1 database:
   ```bash
   npx drizzle-kit generate
   # (Followed by your D1 migration apply command)
   ```

3. **Run Local Server**:
   ```bash
   npm run dev
   ```

4. **Type Generation**:
   Sync types with your Worker configuration:
   ```bash
   npm run cf-typegen
   ```

## Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Technical Considerations

### Cloudflare Worker CPU Limits
Cloudflare Workers (Free Tier) have a **10ms CPU limit**. To ensure authentication (Argon2 hashing) doesn't exceed this:
- `memoryCost` is limited to `256` in `auth.ts`.
- `iterations` and `parallelism` are set to `1`.

### CORS & Error Handling
CORS is handled via Hono middleware. To prevent "Missing CORS header" false-positives during 500 errors, the `app.onError` handler in `src/index.ts` is configured to manually inject `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` headers based on the request origin.

## Database Schema

Defined in `src/db/schema.ts`. Key tables:
- `user`: Core user data including role, textbooks, and `subscriptionExpiry`.
- `session` / `account`: Auth-related tables.
- `practice_records`: Tracking student progress.
- `practice`: Metadata for interactive exercises.
