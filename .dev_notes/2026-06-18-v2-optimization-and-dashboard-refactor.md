# 2026-06-18: v2 Optimization and Dashboard Refactor

This document archives the implementation plans previously stored in the `conductor` folder for historical reference.

---

# v2 Chunk Optimization Plan

## Objective
Resolve the "Some chunks are larger than 500 kB" warning during the `v2` Vite build by implementing code-splitting and optimizing the bundle chunking strategy.

## Key Files & Context
- `v2/src/App.tsx`: Currently statically imports all major components, causing them to be bundled together.
- `v2/vite.config.ts`: Current configuration lacks manual chunking directives for heavy vendor libraries.
- Heavy Dependencies: `recharts` (used in Dashboard/ManageUsers) and `lucide-react`.

## Implementation Steps

### 1. Lazy Load Routes in `App.tsx`
- Replace static imports for major route components with `React.lazy` dynamic imports:
  ```tsx
  const Dashboard = React.lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
  const SignIn = React.lazy(() => import('./SignIn').then(m => ({ default: m.SignIn })));
  const ManageUsers = React.lazy(() => import('./ManageUsers').then(m => ({ default: m.ManageUsers })));
  const UsageGuide = React.lazy(() => import('./UsageGuide').then(m => ({ default: m.UsageGuide })));
  const SwitchUser = React.lazy(() => import('./SwitchUser').then(m => ({ default: m.SwitchUser })));
  const SchulteGame = React.lazy(() => import('./components/SchulteGame').then(m => ({ default: m.SchulteGame })));
  const CardMatchGame = React.lazy(() => import('./components/CardMatchGame').then(m => ({ default: m.CardMatchGame })));
  ```
- Note: Components exported as named exports require mapping to `default` for `React.lazy`.
- Wrap the `<Routes>` block inside the main layout with a `<React.Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>` boundary.

### 2. Configure Manual Chunks in `vite.config.ts`
- Update `vite.config.ts` to add a `build.rollupOptions.output.manualChunks` configuration:
  ```typescript
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'recharts': ['recharts'],
          'lucide': ['lucide-react']
        }
      }
    }
  }
  ```

## Verification & Testing
1. Run the build command: `cd v2 && ../node_modules/.bin/vite build`.
2. Verify that the terminal output shows smaller chunk sizes and the `> 500 kB` warning is resolved or significantly mitigated.
3. Test the application locally (via `npm run preview` or dev server) to ensure routes load correctly via `Suspense` boundaries without crashing.

---

# Dashboard.tsx Optimization Plan

## Objective
Refactor and optimize the monolithic `v2/src/Dashboard.tsx` (~2137 lines) to improve maintainability, reduce initial parsing time, and potentially improve runtime performance by isolating state updates.

## Key Files & Context
- **Target File**: `v2/src/Dashboard.tsx`
- **Goal Directory**: `v2/src/components/dashboard/` (to be created for sub-components)
- **Goal Hooks Directory**: `v2/src/hooks/` (to be created for custom hooks)

## Implementation Steps

### Phase 1: Structure and Utility Extraction
1. Create `v2/src/components/dashboard/` and `v2/src/hooks/` directories if they don't exist.
2. Extract constant definitions and pure utility functions into `v2/src/lib/dashboardUtils.ts`:
   - `PRACTICE_TYPE_ICONS`
   - `translatePracticeName`
   - `translateTextbookName`
   - `FadingPracticeName` (as a reusable micro-component)
   - `FadingMistakeBadge`
   - `getLastUnit`, `saveLastUnit`

### Phase 2: Major Component Extraction
1. **Extract `BookSection`**: Move the `BookSection` component (lines ~211 to ~850) into `v2/src/components/dashboard/BookSection.tsx`. This handles complex textbook-specific navigation logic and is a prime candidate for isolation.
2. **Extract Minor Components**: 
   - Move `TestdriveSelector` to `v2/src/components/dashboard/TestdriveSelector.tsx`.
   - Move `LockdownOverlay` to `v2/src/components/dashboard/LockdownOverlay.tsx`.
   - Move `ScrollDownHint` to `v2/src/components/dashboard/ScrollDownHint.tsx`.
   - Extract the SVG quick navigation block into `v2/src/components/dashboard/QuickNav.tsx`.

### Phase 3: Logic and View Extraction (Mistake Book)
1. Extract the Mistake Book logic and UI into `v2/src/components/dashboard/MistakeBookView.tsx`. This section handles mistake filtering, rendering, and interactions, which bloats the main Dashboard file.

### Phase 4: Data Hooks (Optional but recommended)
1. If the main Dashboard component still contains massive `useEffect` blocks for data fetching, extract them into a custom hook like `useDashboardData.ts` to separate business logic from the UI presentation.

## Verification & Testing
1. Run local development server (`npm run dev`) and ensure the Dashboard loads correctly.
2. Verify all textbook navigation works in the extracted `BookSection` (especially for edge cases like RAZ-B and NCE2).
3. Verify Mistake Book filtering and quick nav still function correctly.
4. Run `vite build` to ensure no circular dependencies or import errors were introduced.