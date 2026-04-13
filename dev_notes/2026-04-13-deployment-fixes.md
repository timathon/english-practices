# Dev Note: Cloudflare Deployment & Local Database Recovery (2026-04-13)

## 1. Cloudflare Workers: 503 Service Unavailable (CPU Limit)
**Problem:** The API intermittently returned 503 errors and "CPU Limit Exceeded" (Error 1102) during login.
**Cause:** `better-auth` uses Argon2 for password hashing by default. On the Cloudflare Workers Free Tier, the CPU time limit is 50ms per request. Argon2's default settings exceed this limit during the hashing process.
**Solution:** Reduced Argon2 hashing costs in `api/src/auth.ts`:
- Set `iterations: 1`
- Set `memoryCost: 512`
This allows the login request to complete within the 50ms CPU window.

## 2. CORS Blocked by Policy
**Problem:** Browser blocked requests to `/api/auth/*` even though CORS was configured.
**Cause:** 
1. Conflict between Hono's `cors` middleware and `better-auth`'s internal CORS handling.
2. Static lists of multiple origins in `Access-Control-Allow-Origin` can cause browser rejection if not handled dynamically.
**Solution:**
- Updated `api/src/index.ts` to use a dynamic CORS origin function that returns only the specific requesting origin (if allowed).
- Applied Hono CORS to all `/api/*` routes consistently.

## 3. Local Database "Wipe" / Missing Data
**Problem:** After updating `wrangler.jsonc` with the production `database_id`, local practices and the user `summer` disappeared.
**Cause:** Wrangler uses the `database_id` to determine the local storage path in `.wrangler/state`. Changing the ID from `"dummy-id"` to the production UUID caused Wrangler to look in a new, empty directory.
**Solution:**
- **Practices:** Re-seeded using `scripts/seed_practices.cjs`.
- **User 'Summer':** Manually extracted her ID and 15 practice records from the old (and corrupt) SQLite file using `strings` and re-inserted them into the new local DB.
- **Schema:** Manually added the missing `updatedAt` column to `practice_records` to match the current schema.

## 4. Admin Password Reset Logic
**Problem:** No built-in way to reset student passwords from the Admin UI without knowing their old password.
**Cause:** `better-auth`'s `changePassword` requires the current password. The `setPassword` API exists but is restrictive if a password is already set.
**Solution:** Implemented **"Shadow Hashing"** in `api/src/index.ts`:
1. Use `signUpEmail` to create a temporary user with the new password.
2. Extract the resulting valid hash from the DB.
3. Update the target user's account with this hash.
4. Clean up the temporary user/sessions.

## Recommendations for Future Deploys
- **Secrets:** Always ensure `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are set in Cloudflare Secrets.
- **Base Paths:** The `v2` frontend should always be built with `VITE_BASE_PATH=/` for custom domains to avoid MIME type errors.
- **Local State:** Do not change `database_id` in `wrangler.jsonc` unless prepared to migrate local state.
