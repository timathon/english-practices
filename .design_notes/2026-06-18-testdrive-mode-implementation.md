# 2026-06-18 Testdrive Mode Implementation

## Overview
Implemented a "Testdrive Mode" to allow prospective users to explore the application without creating a permanent account. This mode provides full access to exercise content but restricts data persistence to the local browser and enforces strict usage windows.

## Simplified Testdrive Rules (Updated 2026-06-18)
To further streamline the experience for prospective users, the default `test0` account has been moved to a content-restricted model instead of a time-restricted one.

### 1. Account Specifics (test0)
- **No Time Limit**: The 20-minute usage window and 1-hour cooldown are disabled.
- **No Session Quota**: The 30-session total quota and 5/day limit are disabled.
- **Unlimited Access**: Users can stay logged in and practice indefinitely.

### 2. Content Restrictions
- **Textbook Selection**: Restricted to a specific set: `A5B`, `A6B`, `A7A`, `B-NCE2`, and `RAZ-B`.
- **Unit Limitation**: After selecting a textbook, only the **first unit** (alphabetically/numerically) is visible and accessible. Other units are hidden from the dashboard.

### 3. Implementation Changes
- **Backend**: Middleware in `api/src/index.ts` skips timing and quota checks if the username is `test0`.
- **Frontend**: 
    - `TestdriveSelector` filters the available books for `test0`.
    - `Dashboard` restricts the `grouped` practices to only include the first unit for `test0`.
    - `Dashboard` lockdown monitoring is disabled for `test0`.
    - `App.tsx` hides the floating `TestdriveTimer` and session count for `test0`.

## Core Features (Legacy/Other Testdrive Roles)

### 1. Testdrive User Role
- Added a `testdrive` role to the user system.
- Seeded a default account (credentials in `temp/secrets/testdrive-credentials.md`) via `/api/setup`.

### 2. Usage Limits & Security (API)
- **20m/1h Window**: Users in the `testdrive` role are limited to a 20-minute active usage window. After 20 minutes, a 1-hour cooldown period is enforced before they can access the platform again.
- **5/Day Daily Limit**: Users are limited to a maximum of 5 testdrive sessions per day.
- **30 Session Quota**: Each `testdrive` account has a total quota of 30 session windows (`testdriveCount`). This quota decrements by 1 every time a new 1-hour window is initiated. When the quota reaches 0, the user is blocked from starting new sessions (`testdrive_quota_exhausted`).
- **30 Device Concurrency**: Increased the device limit for the `testdrive` role to 30 concurrent sessions to accommodate multiple potential testers using the same shared account.
- **Server Persistence Block**: Prevented `testdrive` users from saving practice records, pet states, or mistake lists to the server database. The API returns `403 Forbidden` for these operations.

### 3. Frontend Experience (V2)
- **Textbook Selection**: 
    - Upon login, `testdrive` users must select a single textbook from an overlay (`TestdriveSelector`). This choice is stored in `sessionStorage` and filters the dashboard to only show units from that book.
    - **Change Textbook**: A "更换教材" (Change Book) button is added next to the textbook title on the dashboard, allowing users to switch to a different book during their 20-minute window.
- **Floating Timer**: 
    - A global `TestdriveTimer` component floats at the top-right of the screen (below the navigation button).
    - Displays the remaining time in the current 20-minute window and the remaining session quota (e.g., `×29`).
    - Features 50% transparency (`opacity: 0.5`) and backdrop blur to remain non-intrusive while navigating.
- **Automatic Lockdown**: 
    - A `LockdownOverlay` triggers automatically (via a real-time monitoring hook in `Dashboard.tsx`) as soon as the 20-minute limit is reached or if the quota is exhausted.
    - Displays a real-time countdown until the next 4-hour session window starts.
- **Hidden Reset Shortcuts**:
    - Users can trigger a reset passcode prompt via two hidden shortcuts:
        1. **Navigation Menu**: Tap the version badge **3 times**.
        2. **Lockdown Screen**: Tap the hourglass emoji (`⌛`) **5 times**.
    - Entering the passcode calls a dedicated reset API. The passcode is verified exclusively on the backend using the `TESTDRIVE_RESET_PASSCODE` environment variable.
    - If the API call succeeds, the page reloads to restore access.
- **Local Persistence Interceptor**: 
    - Updated `v2/src/lib/auth.ts` to intercept `fetch` calls for the default testdrive account.
    - Redirects `/api/records`, `/api/mistakes`, and `/api/pet` to local storage implementations.
    - This allows testers to see progress and interact with the pet system during their trial without server data impact.

### 4. Technical Implementation Details
- **Schema**: Added `testdriveWindowStart` (timestamp) to the `user` table.
- **Reset API**: Added `POST /api/testdrive/reset` to the backend. This endpoint is exempted from the usage window check in the middleware to allow locked-out users to reset their timers.
- **Middleware**: Integrated window and concurrency checks into the `/api/*` authentication middleware in `api/src/index.ts`.
- **Interceptors**: The `customFetchImpl` in `v2/src/lib/auth.ts` handles token injection and testdrive data redirection. It enforces a strict response structure for the Pet API to match the database schema and prevent frontend crashes.

## Verification
- Verified the default testdrive account is created during setup.
- Confirmed that the dashboard correctly intercepts API calls and saves to `localStorage`.
- Verified the automatic lockdown and cooldown behavior.
- Verified both reset shortcuts (badge and hourglass) successfully clear the window start time and restore access.
