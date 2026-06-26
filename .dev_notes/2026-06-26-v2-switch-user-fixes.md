# V2 Switch User and Session Fixes (2026-06-26)

This document logs the resolutions for several critical bugs related to session management, user switching, and dashboard rendering in the V2 application.

## 1. Non-Blocking Switch User & Validation Backgrounding
* **Issue:** When the `SwitchUser` page mounted, it verified session tokens for non-active users over the network via `/api/me`. While verifying, a local state `validating` was set to `true`, which disabled all user switch buttons and changed the cursor to `not-allowed`. On slow or remote connections, this locked the UI for several seconds, leaving the user with a frozen screen and no tap feedback.
* **Fix:** Removed the blocking check so that user accounts can be switched immediately. Token verification still runs in the background to dynamically disable expired accounts, but it no longer blocks active user transitions.

## 2. Browser Cookie Limit Compliance (400 Days)
* **Issue:** An attempt to configure permanent sessions by setting `session.expiresIn` to 10 years in `api/src/auth.ts` resulted in a server crash with:
  `Error: Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.`
  Modern browsers and specifications enforce a strict 400-day limit on `Max-Age` for security reasons.
* **Fix:** Reduced `expiresIn` to **1 year (365 days)** inside `api/src/auth.ts` to fully comply with browser and library limits.

## 3. Session Switching Interceptor Match
* **Issue:** When switching users, the client calls `/api/auth/multi-session/set-active`. The custom fetch interceptor (`customFetchImpl` in `auth.ts`) had a check to prevent injecting the old `Authorization` header on auth endpoints. However, it was checking `url.includes('/api/auth/set-active')`, which did not match because the URL is `/api/auth/multi-session/set-active`. As a result, the old active token was injected into the request, preventing the switch.
* **Fix:** Updated the check to match `set-active` generally, bypassing bearer token injection on the session transition endpoint.

## 4. Multi-Session Switch Race Condition
* **Issue:** When switching active sessions, calling `await authClient.multiSession.setActive(...)` immediately triggers a background session refetch `/api/auth/get-session` from the client library. Since `localStorage.setItem('active_session_token', token)` was called *after* `setActive` resolved, the background refetch was sent with the *old* user token. This caused the response interceptor to overwrite localStorage back to the old user token.
* **Fix:** Updated [SwitchUser.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/SwitchUser.tsx) and [App.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/App.tsx) to update `active_session_token` in `localStorage` **before** calling `setActive`.

## 5. React Hooks Order Violation (Error #300) on Logout
* **Issue:** Logging out caused a crash with `Minified React error #300` (Rendered fewer hooks than expected). In `Dashboard.tsx`, the `last7DaysStats` `useMemo` hook was declared after the early return check `if (!session)`. When a user logged out, the early return was hit, causing React to miss the hook call.
* **Fix:** Moved the `getLast7DaysStats` helper and the `useMemo` hook declaration above the conditional `if (!session)` check.

## 6. Multi-User Log Out Graceful Swapping
* **Issue:** When a user clicked "Sign Out" or removed the current active user on a multi-user device, calling `signOut()` first cleared the browser cookies. This caused any subsequent attempts to call `setActive` to fail, resulting in a full logout.
* **Fix:** Adjusted signout logic in both `App.tsx` and `SwitchUser.tsx`. We now only call `signOut()` if there are no other logged-in users remaining on the device. If other users are logged in, we immediately switch active session via `setActive()` and redirect directly to the dashboard.
