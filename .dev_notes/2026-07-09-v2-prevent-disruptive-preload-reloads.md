# v2: Prevent Disruptive Preload Reloads on Wake-up

## Context
When returning to the browser after using other apps, the page was frequently triggering an annoying refresh, flashing the "Loading..." screen. 

## Investigation
1. When a mobile device or background tab wakes up, the network connection is temporarily absent for a few seconds during reconnection.
2. Under the hood, Vite or React Router tries to prefetch chunks (lazy-loaded modules) in the background. Because of the temporary network drop, these background fetches failed and threw a `vite:preloadError` event.
3. The app had a global listener for `vite:preloadError` in `App.tsx` that immediately called `forceRefreshBypassCache()`, resulting in a sudden, disruptive full-page reload even though the user's active view was fully functional.
4. Additionally, the React Router ErrorBoundary was auto-reloading the page on any chunk loading error without checking if the device was currently online, which could trigger infinite reload loops or force browser offline error pages when the network was disconnected.

## Changes Made
1. **Disabled Auto-Reload on `vite:preloadError`**: 
   Modified the global listener in `v2/src/App.tsx` to log a warning rather than forcing a reload. Dynamic import failures for actual route transitions are already safely caught by the ErrorBoundary.
2. **Added `navigator.onLine` Check**:
   Modified the chunk error auto-reload handler in `App.tsx`'s `ErrorBoundary` to only call `forceRefreshBypassCache()` if `navigator.onLine` is true. This prevents frustrating page refreshes during network drops.
