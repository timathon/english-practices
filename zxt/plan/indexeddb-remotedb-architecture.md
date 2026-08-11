# IndexedDB & Remote DB Hybrid Architecture Specification

## 1. Overview
To optimize bandwidth, eliminate payload bloat, and provide instant sub-millisecond UI rendering, the 知新堂 (ZXT) platform implements a hybrid **IndexedDB + Remote DB (Cloudflare D1)** stale-while-revalidate data strategy.

---

## 2. API Endpoints & Payload Optimization

### A. History List Endpoint (`GET /api/student/history?studentId=...`)
- **Concise Response**: Returns high-level summary objects containing:
  - `id`: Unique record ID (e.g. `qh_...`)
  - `studentId`: Student ID
  - `poemId` & `poemTitle`: Target poem title & ID
  - `score` & `accuracy`: Numeric score & accuracy percentage
  - `quizType`: Quiz mode/type
  - `completedAt`: Timestamp formatted string
  - `pointBreakdown`: Summary of points earned
- **Payload Bloat Prevention**: Omits the heavy `details` TEXT column (question arrays, options, student answers) from list responses to keep API payload size minimal.

### B. History Detail Endpoint (`GET /api/student/history/:id`)
- **On-Demand Detail Fetching**: Returns the complete quiz record including full question details (`details` array with questions, student choices, correctness, and explanations). Executed only when a user clicks on an item to view details.

### C. Quiz Completion Endpoint (`POST /api/student/history`)
- Receives completed quiz submission and saves the record in Cloudflare D1 database while returning point breakdown metadata.

---

## 3. Web Client IndexedDB Caching Layer (`zxt/web/src/services/db.ts`)

### IndexedDB Database: `ZXT_IndexedDB` (v1)

#### Object Stores:
1. `quiz_history_list`: Keyed by `studentId`. Stores the concise history list for instant rendering of:
   - **修业历史 list** (`WenGuShi.tsx` / `StudentQuizHistoryTab.tsx`)
   - **我的修业打卡记录** (`PointsHistoryModal.tsx`)
2. `quiz_history_details`: Keyed by history record `id`. Stores full quiz details (questions, choices, correctness, image URLs, point breakdown).

---

## 4. Stale-While-Revalidate Flow & Local Sync

### A. History Lists & Check-in Records (修业历史 list & 我的修业打卡记录)
1. **Instant UI Load**: When opening history views or check-in records modal, `idbService.getHistoryList(studentId)` reads from IndexedDB first and renders immediately (0ms delay).
2. **Background Revalidation**: `apiService.getQuizHistory` concurrently fires an asynchronous fetch to `GET /api/student/history?studentId=...`.
3. **Seamless Update**: Once the remote query returns, it updates IndexedDB stores (`quiz_history_list` & `quiz_history_details`) and triggers the `onRemoteUpdate` callback to update the UI with fresh data.

### B. History Details (修业历史 detail modal)
1. **Instant Detail Load**: Clicking a history item calls `idbService.getHistoryDetail(id)`. If details exist in IndexedDB, they render instantly.
2. **On-Demand Fetch**: If details are not present in IndexedDB or require revalidation, `apiService.getQuizHistoryDetail(id)` fetches `GET /api/student/history/:id` from the backend, caches the response in IndexedDB `quiz_history_details`, and updates the modal UI.

### C. Quiz Completion Write-Through
1. When a student completes a quiz (`apiService.recordQuizResult`):
   - **IndexedDB Details**: The full record (with `details` array & `pointBreakdown`) is saved immediately into `quiz_history_details`.
   - **IndexedDB List**: The concise list is updated in `quiz_history_list`.
   - **Remote DB Sync**: Non-blocking background call sends the result to `POST /api/student/history`. If offline or network fails, it queues in `syncQueue` for automatic retry.
