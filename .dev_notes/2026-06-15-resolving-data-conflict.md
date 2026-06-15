# 2026-06-15: Resolving Multi-Device Data Conflicts (A, B, C)

## Overview
Implemented a robust multi-device synchronization and conflict resolution architecture to handle concurrent logins under the same account. This addresses data conflicts for `petState` (pet stats and daily progress) and `mistakeState` (mistake tracking/review collections), and implements lifecycle-aware background synchronization.

---

## Technical Details & The Issues

1. **LWW (Last-Write-Wins) Desyncs**: Previously, `petState` reconciliation relied on a simple global timestamp check: whoever had the newer `lastUpdated` timestamp overwrote the entire database row. This resulted in progress (XP, streaking, coins) earned on another device being completely lost if overwritten.
2. **Coin/Item Duplication Vulnerability**: Using a simple `Math.max()` for coins and food items during merges introduced a duplication bug: spending resource balances (which decreases count) would be overwritten by another device showing the higher pre-spending count, refunding the user.
3. **Mistakes Full-Array Overwrite**: The `mistakeState` array was overwritten as a monolithic JSON block. Additionally, when a mistake was resolved or deleted, the action did not immediately sync to the server, nor did it update the mistake's timestamp, causing the server's older status to resurrect the resolved mistake on future pulls.
4. **Resurrection of Deleted Mistakes**: Hard-deleting mistakes locally meant that when merging with the server (which still had the mistakes), the missing entries were pulled back, resurrecting the deleted items.

---

## Resolutions

### 1. Hybrid Merge and LWW Classification for Pet State
We modified [petService.ts](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/petService.ts) to classify properties into two merge types:
- **Transient & Balance attributes** (e.g. `food`, `love`, `goldCoins`, `foodItems`, rounds remaining, pet metadata) strictly use **LWW (Last-Write-Wins)** based on the newer `lastUpdated` timestamp to prevent duplicate coins or desynced balances.
- **Progress & Accumulative attributes** (e.g. `xp`, `level`, `totalCorrect`, streaks, achievements) are resolved using `Math.max` or set unions to ensure no student progress is reverted.
- **PUT `/api/pet` Conflict Response**: In [index.ts](file:///home/timathon/codes/smartedu/english-practices/api/src/index.ts), if the database has a newer timestamp than the incoming client request, the server returns a `409 Conflict` containing the server state. The client catches this, merges, and retries the sync automatically.

### 2. Mistakes soft-deletion, timestamp updates, and real-time syncing
We updated [mistakeService.ts](file:///home/timathon/codes/smartedu/english-practices/v2/src/lib/mistakeService.ts):
- **Immediate Push**: All operations (`addMistake`, `resolveMistake`, `removeMistake`, `recordAttempt`, and `clearAllMistakes`) now trigger an immediate `syncToServer()`.
- **Tombstones & Soft-Deletion**: Deleting or clearing mistakes sets a `deleted: true` flag and updates the mistake's `createdAt` timestamp. This propagates the tombstone cleanly during merging.
- **Server-Side Auto-Merge**: The PUT `/api/mistakes` endpoint in [index.ts](file:///home/timathon/codes/smartedu/english-practices/api/src/index.ts) now fetches existing mistakes and automatically merges them with the client payload by ID and latest timestamp, returning the finalized merged list.
- **Dashboard Filtering**: [Dashboard.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/Dashboard.tsx) was updated to filter out `deleted` or `resolved` mistakes from the unlisted/cool-down counts so they do not artificially inflate badge counters.

### 3. Lifecycle-Aware Background Synchronization
We modified [App.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/App.tsx) and [Dashboard.tsx](file:///home/timathon/codes/smartedu/english-practices/v2/src/Dashboard.tsx):
- Added window focus and document visibility listeners. When a student switches browser tabs or returns to the application on their device, a background sync is triggered.
- Auto-sync events are throttled to a minimum of 15 seconds to prevent backend/D1 rate-limiting.
