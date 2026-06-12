# Switch User — Design Notes

## Overview

Multi-session user switching with token validation and expired session handling.

## Architecture

### Data Storage (localStorage)

- `active_session_token` — Bearer token of the currently active user
- `logged_in_users` — JSON array of `LoggedInUser` objects:
  ```ts
  interface LoggedInUser {
    userId: string;
    username: string;
    name: string;
    role: string;
    token: string;
  }
  ```

### Max Users

- **3 users max** simultaneously (1 active + 2 in the switch list)
- Enforced in `auth.ts` fetch interceptor on sign-in: if `logged_in_users.length > 3`, oldest entries are dropped
- "Add Account" card is hidden when already at 3 users

### Token Validation on Page Load

When the Switch User page mounts:

1. Load `logged_in_users` from localStorage
2. For each **non-active** user, send `GET /api/me` with their bearer token in the `Authorization` header
3. If the server returns non-200 (e.g. 401), the token is expired/invalid → mark it as invalid
4. Invalid users are rendered **greyed out** (opacity 0.5, grayscale, `cursor: not-allowed`) with a red **"SESSION EXPIRED"** badge
5. Clicking a greyed-out card does nothing (blocked in `handleSwitch`)

### Cleanup on Navigate Away

When the user navigates away from the Switch User page (component unmount):

- All tokens marked as invalid are **removed from `logged_in_users`** in localStorage
- This uses a `useRef` to track invalid tokens across renders, read in the cleanup effect

### Flow: Successful Switch

1. User clicks a valid (non-greyed) user card
2. `authClient.multiSession.setActive({ sessionToken: token })` is called (better-auth updates the HttpOnly session cookie)
3. `active_session_token` is updated in localStorage
4. Full page reload to `/dashboard` resets all client state

### Flow: Sign Out (from nav menu)

1. Current user's token is removed from `logged_in_users`
2. `active_session_token` is cleared
3. `signOut()` is called
4. If other users remain, auto-switch to the first one; otherwise redirect to `/signin`

## Key Files

- `v2/src/lib/auth.ts` — Fetch interceptor (token injection, login caching, max-3 enforcement)
- `v2/src/SwitchUser.tsx` — Switch UI with token validation and greyed-out expired sessions
- `v2/src/App.tsx` — Navigation menu with sign-out logic and switch-user link
