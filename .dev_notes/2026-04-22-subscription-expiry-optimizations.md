# 2026-04-22: Subscription Expiry & Cloudflare Worker Optimizations

## Overview
Implemented user subscription expiry and resolved critical deployment issues related to CORS and Cloudflare Worker CPU limits.

## Key Features
- **Subscription Expiry**: Added `subscriptionExpiry` field to `user` table. 
- **Access Control**: Backend now enforces expiry; expired users receive 403 or empty lists.
- **Admin Cleanup**: Deleting a user now automatically clears their `sessions`, `accounts`, and `practice_records` to prevent foreign key constraint violations.

## Technical Resolutions

### 1. Cloudflare Worker CPU Limits (10ms)
**Issue**: `better-auth` sign-in was timing out (403 or 500) because password hashing (Argon2) exceeded the Free Tier CPU limit.
**Fix**: Reduced Argon2 complexity in `api/src/auth.ts`:
```ts
password: {
    hashOptions: {
        memoryCost: 256, // Reduced from 512+
        iterations: 1,
        parallelism: 1
    }
}
```

### 2. Missing CORS Headers on Errors
**Issue**: When the backend threw an error (500), Hono's default error handler didn't include CORS headers, causing the browser to report a "CORS Error" instead of the actual backend error.
**Fix**: Updated `api/src/index.ts` global error handler to manually inject CORS headers:
```ts
app.onError((err, c) => {
  const origin = c.req.header('Origin')
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin)
    c.header('Access-Control-Allow-Credentials', 'true')
  }
  return c.text('Internal Server Error: ' + err.message, 500);
})
```

### 3. Database Migrations
**Issue**: Local database out of sync with schema.
**Fix**: Ran `npx drizzle-kit generate` and `npx wrangler d1 migrations apply english-practices-db --local`.
**Remote**: Applied migrations to remote using `--remote` flag.
