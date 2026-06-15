# 2026-06-15: Session Limit Enforcement (Max 2 Devices)

## Overview
Implemented account abuse protection by limiting concurrent logged-in sessions to a maximum of 2 active devices per user. When a third device logs in and checks its session, the oldest active session is automatically revoked, and the revoked device is signed out with a user-friendly alert on its next backend interaction.

---

## Technical Details

### The Multi-Device Revocation Flow
1. **Limiting on Session Check**: During a session check at `/api/me`, the Hono server checks D1 active sessions for the user:
   - If `count > 2`, the database updates the oldest sessions' `expiresAt` timestamps to the epoch start (`1970-01-01 00:00:00` / `new Date(0)`).
   - Using this sentinel epoch timestamp allows `better-auth`'s internal validation to immediately treat it as expired, while maintaining the record in the database for client-revocation classification.
2. **Revocation Interception Middleware**: An API middleware intercepts all `/api/*` requests. If a request is received from a token whose database session has `expiresAt.getTime() === 0`, it cleans up the session row and immediately responds with a `401 Unauthorized` and JSON payload:
   ```json
   { "error": "Session revoked", "reason": "device_limit" }
   ```
3. **Client-Side Purge & Redirect**: The client-side global fetch interceptor in `v2/src/lib/auth.ts` catches the `401` response with `reason === 'device_limit'`. It purges the local session token, cleans the user from the local `logged_in_users` list, and redirects the browser to `/signin?reason=device_limit`.
4. **User-Friendly UI notice**: The login view (`SignIn.tsx`) displays a warning card if the URL parameter matches `reason=device_limit`.

---

## Resolutions

### 1. API Changes (`api/src/index.ts`)
Added a token extractor, interceptor middleware, and concurrent limit check on `/api/me`:

```ts
// Middleware interceptor
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  if (path.startsWith('/api/auth') || path === '/api/setup') {
    return await next();
  }

  const db = drizzle(c.env.DB);
  const token = getSessionToken(c);
  
  if (token) {
    const sessRows = await db.select().from(sessionTable).where(eq(sessionTable.token, token));
    if (sessRows.length > 0) {
      const dbSess = sessRows[0];
      const expiresTime = new Date(dbSess.expiresAt).getTime();
      if (expiresTime === 0) {
        await db.delete(sessionTable).where(eq(sessionTable.id, dbSess.id));
        return c.json({ error: "Session revoked", reason: "device_limit" }, 401);
      }
    }
  }

  await next();
});
```

### 2. Client Fetch Interceptor (`v2/src/lib/auth.ts`)
Updated the fetch interceptor `customFetchImpl` to monitor `401` statuses:

```ts
    // Intercept 401 revoked session due to device limit
    if (response.status === 401) {
        try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && (data.reason === 'device_limit' || data.error === 'Session revoked')) {
                const revokedToken = localStorage.getItem('active_session_token');
                localStorage.removeItem('active_session_token');
                
                let loggedInUsers = [];
                try {
                    loggedInUsers = JSON.parse(localStorage.getItem('logged_in_users') || '[]');
                } catch (e) {}
                if (Array.isArray(loggedInUsers)) {
                    loggedInUsers = loggedInUsers.filter((u: any) => u.token !== revokedToken);
                    localStorage.setItem('logged_in_users', JSON.stringify(loggedInUsers));
                }
                
                window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/signin?reason=device_limit`;
            }
        } catch (e) {
            console.error('[Auth Interceptor] Failed to parse 401 response:', e);
        }
    }
```

### 3. Login Notification Alert (`v2/src/SignIn.tsx`)
Rendered a custom alert box at the top of the SignIn card when redirected with `?reason=device_limit`.
