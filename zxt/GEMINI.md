# ZXT (知新堂) Development Guidelines & Architecture Constraints

This file defines project-specific rules and data fetching patterns for the ZXT module.

---

## Data Fetching & Caching Strategy: IndexedDB First

### Core Rule:
**Always check IndexedDB first before making any remote HTTP/DB request, unless timely real-time data is explicitly required.**

### Implementation Standard:
1. **Single Record & Detail Queries** (e.g. `getQuizHistoryDetail`, single poem details, historical exercise breakdowns):
   - Check `idbService` first.
   - If the detail record exists in IndexedDB, **return immediately** without making any remote network/API request.
   - Do **NOT** fire background revalidation calls for static or historical detail records if they are already present in IndexedDB.

2. **List & Summary Queries** (e.g. `getQuizHistory`, rosters, check-in history lists):
   - Read from IndexedDB / `localStorage` first for instant sub-millisecond UI rendering (0ms delay).
   - Enforce time throttling (e.g. max 1 request per 60 seconds per resource) before issuing any background remote revalidation call to Cloudflare D1.

3. **Quiz & Submission Writes**:
   - **Write-Through**: Save complete detail records to IndexedDB (`quiz_history_details`) and update local concise lists immediately.
   - Issue non-blocking background POST calls to remote DB (`/api/student/history`), queuing offline sync tasks if network is unavailable.

---

## File Size & Modular Architecture Rules

### 1000-Line Limit Rule:
- **Hard Limit**: Any source file exceeding **1,000 lines of code** must be refactored and split into smaller, single-responsibility sub-components, helper utilities, or domain workspaces.
- **Decomposition Guidelines**:
  - Extract reusable sub-views into dedicated sub-component files (e.g. tabs, modals, workspace panels).
  - Extract static constants, color mappings, and type dictionaries into separate `*Constants.ts` files.
  - Extract pure helper functions and business logic into separate `*Utils.ts` or custom hooks.
  - Keep the parent component as a clean, high-level orchestrator focusing on state management and coordinator flow.
