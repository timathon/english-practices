# SVG Stroke Animation Reset Race Condition & CSS Transition Bug

## Context
The handwriting trace modal and card views animate SVG strokes step-by-step using `strokeDashoffset` (transitioning from `200` to `0`). Upon finishing a word, it pauses, clears, and restarts the animation loop.

## The Bug
When starting a new loop, the first stroke of the word would briefly render as fully drawn (with no animation), vanish ("empty" state), and then start writing.

This was caused by two overlapping issues:

### 1. Non-Atomic State Updates
Originally, `completedStrokes` and `animatingStrokeOffset` were managed via two separate `useState` hooks. Resetting them inside a `setTimeout` callback resulted in React rendering a split frame where `completedStrokes = 0` (first stroke active) but `animatingStrokeOffset = 0` (fully drawn), before applying the offset update.
* **Fix**: Combined the state variables into a single atomic state object:
  ```typescript
  const [animState, setAnimState] = useState({ completed: 0, offset: 200 });
  ```

### 2. CSS Transition on Stroke Dashoffset
Even after making state updates atomic, the first stroke still briefly appeared fully drawn on reset. This was because `.vt-letter-stroke` has a CSS transition rule:
```css
transition: stroke-dashoffset 0.15s linear;
```
When resetting back to the beginning:
- Subsequent strokes (indices > 0) are flagged as `isNotStarted = true` and unmounted instantly from the DOM.
- The first stroke (index 0) remains mounted in the DOM (`isNotStarted = false`). Because of the CSS transition, its `stroke-dashoffset` transitioned from `0` (fully written) to `200` (hidden) over `150ms` rather than jumping instantly. This caused a visible shrink/fade artifact.
- **Fix**: Updated the `isNotStarted` conditional logic to force-unmount the first stroke when the animation is in its initial delay/paused state:
  ```typescript
  const isNotStarted = globalIdx > completedStrokes || (completedStrokes === 0 && animatingStrokeOffset === 200);
  ```
  Unmounting the element from the DOM on reset bypasses the CSS transition, causing it to disappear instantly along with all other strokes.
