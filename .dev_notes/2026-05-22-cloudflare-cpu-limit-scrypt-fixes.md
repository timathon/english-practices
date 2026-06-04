# Dev Note: Cloudflare Workers CPU Limit & scrypt Hashing Optimization (2026-05-22)

## 1. Cloudflare Workers: 503 Service Unavailable (CPU Limit Exceeded / Error 1102)
**Problem:** When accessing the application deployed to Cloudflare, attempts to sign in failed with network errors and browser CORS blocking messages. The worker logs showed an HTTP 503 response and Cloudflare's Error 1102: "Worker CPU Limit Exceeded".

**Cause:** 
- The backend `better-auth` integration was configured to use `scrypt` for password hashing/verification.
- Standard `better-auth` hashes passwords using a pure JavaScript implementation of `scrypt` (from `@noble/hashes`), which is a synchronous, CPU-intensive operation.
- The default scrypt configuration parameters ($N=16384$, $r=16$, $p=1$) take approximately 80ms-90ms of pure CPU time in JavaScript.
- On Cloudflare Workers' Free Tier, CPU time is strictly capped at **50ms** per request. Thus, the worker script was terminated mid-execution, returning a 503.

## 2. CORS Blockages
**Problem:** The browser console reported that access to `/api/auth/sign-in/username` was blocked by CORS policy because the `Access-Control-Allow-Origin` header was missing on the requested resource.

**Cause:** This CORS error was a direct side effect of the Worker crash. Since the CPU limit was exceeded, the Hono/better-auth runtime crashed before sending headers, leading to a standard Cloudflare error page lacking the CORS response headers.

## 3. The Solution: Native `crypto.scrypt` & Parameters Tuning
To run password verification and generation within the Worker's CPU limits, we bypassed the pure JS hashing library with an optimized native approach.

### Step 1: Enable Node.js Compatibility
We enabled native Node modules in Cloudflare Workers by adding the `nodejs_compat` flag in the configuration:
- In `api/wrangler.jsonc`:
  ```json
  "compatibility_flags": [
    "nodejs_compat"
  ]
  ```
- In `api/tsconfig.json`, we added `"node"` to the `"types"` array to support Node.js types:
  ```json
  "types": ["@cloudflare/workers-types", "node"]
  ```

### Step 2: Implement Native Hashing and Tuning
In `api/src/auth.ts`, we configured `better-auth`'s `emailAndPassword.password` option with custom `hash` and `verify` hooks utilizing `crypto.scrypt` from the native `node:crypto` library:
- **Hashing Parameters ($N=1024, r=8, p=1$):** For new user registrations or updates, we use native `crypto.scrypt` with a reduced complexity of $N=1024$. This runs in approximately **2ms** in the Worker C++ environment, well under the 50ms CPU budget.
- **Verification & Legacy Fallback:** When verifying passwords:
  1. We split the stored hash (`salt:hash`).
  2. First, we try verification with the lightweight $N=1024, r=8$ parameters (for newly created users).
  3. If that doesn't match, we fallback to legacy parameters ($N=16384, r=16$) but execute it using the native C++ `crypto.scrypt` module (with `maxmem: 67108864`). The native implementation processes the legacy settings fast enough to fit within Worker limits without throwing CPU errors.
  4. Added explicit type annotations (`err: Error | null, derivedKey: Buffer`) to keep strict type-checking clean.

## 4. Frontend UX: "Signing in..." Loader
**Problem:** When clicking "Sign In", there was no loading indicator, leading to users potentially clicking multiple times.
**Solution:**
- Added a `loading` state in `v2/src/SignIn.tsx`.
- The sign-in submit button now disables itself and shows `"Signing in..."` while the authentication request is unresolved.
