# Unit Focus State Restoration — Design Notes

## Overview

State preservation of the active textbook and unit focus when transitioning between the Dashboard and individual practice shells (e.g., Vocab Master, Text Navigator, Recall Map).

## Architecture

To ensure the user returns to the exact textbook and unit they were practicing without resetting the UI state, the application implements a multi-tier focus restoration mechanism.

### 1. Active State Passing via React Router State (Primary)

When returning from a practice shell to the dashboard, the back/home navigation must pass the active context:

- Individual shells (e.g. `VocabMasterShell`, `MindMapShell`, `RecallMapShell`, `VocabGuideShell`) use React Router's `<Link>` component instead of standard browser back buttons (`window.history.back()`):
  ```tsx
  <Link to="/dashboard" state={{ textbook, unit }} className="back-btn">🏠</Link>
  ```
- Upon mounting, the `Dashboard` checks the router state (`useLocation().state`):
  ```ts
  const location = useLocation()
  const returnState = location.state as { textbook?: string; unit?: string } | null
  const targetTextbook = returnState?.textbook || sessionStorage.getItem('last-active-textbook') || ''
  const targetUnit = returnState?.unit || sessionStorage.getItem('last-active-unit') || ''
  ```

### 2. Session Caching (Secondary Fallback)

As a backup for direct browser history actions, `sessionStorage` tracks the last active textbook, unit, and page whenever a user opens a practice from the dashboard:
- Captured on the practice Link's `onClick` handler:
  ```tsx
  onClick={() => {
    sessionStorage.setItem('last-active-textbook', p.textbook);
    sessionStorage.setItem('last-active-unit', p.unit);
  }}
  ```
- Cleaned up asynchronously via a `100ms` timeout once the dashboard finishes loading to prevent stale state from leaking into subsequent page views:
  ```ts
  useEffect(() => {
    if (!loading && targetTextbook) {
      const timer = setTimeout(() => {
        sessionStorage.removeItem('last-active-textbook');
        sessionStorage.removeItem('last-active-unit');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, targetTextbook]);
  ```

### 3. LocalStorage Unit Memory (Tertiary Fallback)

To persist the selected unit tab for each textbook across user sessions, the dashboard writes the selected unit to `localStorage` under `ep-last-units`:
- Read when initializing active tabs:
  ```ts
  const stored = getLastUnit(tb) // fallback if targetUnit is absent
  ```

## Key Files

- `v2/src/Dashboard.tsx` — Handles target unit focus detection on load, handles rendering tabs and scroll position, and cleans up session tokens.
- `v2/src/components/PracticeShell.tsx` — Standard practice entry wrapper that passes down both `textbook` and `unit` props to nested sub-shells.
- `v2/src/components/MindMapShell.tsx` — Mindmap viewer used for Text Navigators & Writing Maps. Uses stateful `<Link>` to return home.
- `v2/src/components/RecallMapShell.tsx` — Mindmap recall utility. Uses stateful `<Link>` to return home.
- `v2/src/components/VocabGuideShell.tsx` — Study sheet list for vocabulary. Uses stateful `<Link>` to return home.
