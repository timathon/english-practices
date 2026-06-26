# 0ms Waiting UX Implementation Plan

This design document outlines a multi-step, phased approach to achieve a 0ms waiting UX for the English Practices application. We will implement and test one phase at a time (verifying stability and behavior over 1–2 days per phase) before proceeding.

---

## Current Architecture Analysis
- **App Code**: Delivered as static HTML pages containing templates/shells. Scripts fetch JSON practice data dynamically or load inlined assets.
- **Audio Files**: Dynamically cached in IndexedDB (`ep-audio-cache` database, `audio` store) during playback or manual refresh.
- **Practice JSON**: Dynamically fetched via standard `fetch(url)`. If the network is slow, page loading is delayed.

---

## Phase 1: Implement Practice JSON Caching in IndexedDB
**Goal**: Load practice data instantly (0ms) from local cache if previously fetched, updating in the background.

### Actual Implementation
1. **IndexedDB Utility**: Created `v2/src/lib/practiceCache.ts` using the database `ep-practice-cache` and the `practices` object store.
2. **Dynamic Cache Loading & Background Sync**: Modified `v2/src/components/PracticeShell.tsx` to read from IndexedDB immediately on mount, and simultaneously trigger a background network fetch. If the fetched data is different from cached data, the cache is updated and the React state re-renders.
3. **Duplicate Request Prevention**: Integrated `AbortController` in `PracticeShell.tsx`'s `useEffect` cleanup to cancel stale/duplicate in-flight fetches caused by Strict Mode double-mounting or page navigation.

### Verification
- Verified by building (`npm run build`) in `v2` without errors.
- Confirmed duplicate requests are successfully aborted and shown as `(canceled)` in Chrome DevTools.

---

## Phase 1.5: Unit Practice Prefetching (Completed)
**Goal**: Preload all other practices of the active unit in the background after the first one finishes loading, ensuring the user experiences a 0ms wait when switching between exercises in the same unit.

### Actual Implementation
- **Sibling Fetching**: Updated `PracticeShell.tsx` to automatically trigger `triggerPrefetchUnitPractices()` when the practice data finishes loading (from cache or network).
- **Background Deferral**: Resolves the full practices list using the in-memory practices cache (or fetching `/api/practices` in the background if empty) and filters for other exercises belonging to the same `textbook` and `unit`.
- **Idle Execution**: Initiates background fetches of these sibling files using `requestIdleCallback` (or `setTimeout` fallback) to prevent interfering with active user interactions.

---

## Phase 2: Service Worker Integration for App Code & Assets
**Goal**: Make static pages, stylesheets, scripts, and fonts load instantly (0ms) and work offline.

### Steps
1. **Create Service Worker (`sw.js`)**:
   - Implement a Cache-First service worker caching core assets:
     - Root index page (`/index.html`)
     - Core stylesheets and shared scripts
     - Web fonts (e.g., Google Fonts or local font files)
2. **Implement Stale-While-Revalidate**:
   - Serve static pages from Cache Storage immediately.
   - Revalidate from network in background.
   - Inform the user with a non-intrusive toast notification if a new app version is ready ("New version available. Reload to update").
3. **Register Service Worker**:
   - Add registration code to `index.html` and shell templates.
4. **Verification**:
   - Test offline capabilities by disabling internet connectivity in Chrome DevTools.
   - Verify that the app shell loads in under 50ms (0ms network delay).

---

## Phase 3: Step-Ahead Audio Prefetching
**Goal**: Remove audio loading lag during exercise transitions.

### Steps
1. **Queue Next Questions**:
   - When a user loads a challenge, scan the next 3 questions/items.
   - Trigger silent background requests to download and cache their audio files into IndexedDB.
2. **Pre-Create Object URLs**:
   - Keep a pool of ready-to-play `URL.createObjectURL(blob)` references for the current and immediately upcoming questions so audio starts playing the instant a button is clicked.
3. **Verification**:
   - Inspect Chrome DevTools Application -> IndexedDB tab to verify that audio files for upcoming questions are populated before the user navigates to them.
   - Measure audio playback latency (ensure it is <10ms from click).

---

## Phase 4: Idle-Time Unit Prefetching
**Goal**: Preload subsequent units before the user clicks them.

### Steps
1. **Analyze Navigation Graph**:
   - Determine which unit the user is likely to visit next (e.g., if on Unit 1, Unit 2 is the target).
2. **Trigger requestIdleCallback**:
   - When the browser is idle during a practice session, download and cache the JSON and audio for the next logical unit.
3. **Verification**:
   - Ensure background downloading doesn't compete with active user interactions or cause main-thread frame drops (jank).

---

## Phase 5: Progressive Web App (PWA) Manifest & Storage Guard
**Goal**: Prevent the OS from clearing caches and provide a native app shell.

### Steps
1. **Create Web App Manifest (`manifest.json`)**:
   - Add name, icons, theme colors, and display configuration.
2. **Request Persistent Storage**:
   - Request `navigator.storage.persist()` permission to protect IndexedDB and Cache Storage from automatic eviction by the browser when disk space is low.
3. **Verification**:
   - Verify the "Install App" button appears in the browser address bar.
   - Confirm storage status via `navigator.storage.persisted()`.
