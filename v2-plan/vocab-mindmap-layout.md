# Vocabulary Guide Mindmap Layout Architecture

This document records the architectural design, layout algorithms, mathematical models, and coordinate transformations used for the interactive **Vocabulary Mindmap** (`VocabMindmapModal`) in `v2`.

---

## 1. Overview & Data Schema

The mindmap is rendered directly from the `unit_vocabulary_mindmap` field in `*-vocab-guide.json` (e.g. `v2-data/A7A/a7a-u3/a7a-u3-vocab-guide.json`).

### Hierarchy & Node Model
```typescript
interface Node {
  id: string              // Unique identifier (e.g. 'root', 'activities', 'act_run')
  text: string            // Primary English text or label
  cn?: string             // Chinese translation or subtitle
  emoji?: string          // Mnemonic emoji icon
  children?: Node[]       // Nested children (depth 1: themes, depth 2: words, depth 3: sub-words)
}
```

---

## 2. Bilateral Tree Layout & Coordinate System

### Coordinate Origin `(0, 0)`
- The **Root Node Core** (`depth = 0`) is placed mathematically at `(0, 0)`.
- The canvas stage uses:
  ```css
  .vmm-canvas-transform {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    transform-origin: 0 0;
    transform: translate(${pan.x}px, ${pan.y}px) scale(${zoom});
  }
  ```
- When the modal opens with `pan = { x: 0, y: 0 }`, the root node is guaranteed to be **dead-center in the viewport**.

---

## 3. Directional Alignment & Wing Splitting

Main branches (`depth = 1`) are split evenly into two wings:
1. **Right Wing (`side = 'right'`)**: Branches `0` to `ceil(N/2) - 1`, expanding towards `+X`.
2. **Left Wing (`side = 'left'`)**: Branches `ceil(N/2)` to `N - 1`, expanding towards `-X`.

### Directional Edge Anchoring
To prevent cards with different text lengths from creating jagged edges or overlapping the center root:
- **Right wing cards (`.side-right`)**: Anchored by their **left edge** (`transform: translate(0, -50%)`).
- **Left wing cards (`.side-left`)**: Anchored by their **right edge** (`transform: translate(-100%, -50%)`).
- **Root core (`.depth-0`)**: Centered (`transform: translate(-50%, -50%)`).

This ensures both the left and right wings form clean, straight vertical columns facing the central root.

---

## 4. Radial Arc & Collision Prevention

### Level 1 Spacing
- `COL_GAP = 300px`: Provides a wide, comfortable breathing zone between the root pill boundary (`x = ±75px`) and the 1st-level branch columns.
- `ROW_HEIGHT = 84px`: Guarantees that even with tall padding and hover shadows, adjacent branch rows never touch or overlap vertically.

### Level 2 (Child Words) Radial Arc Layout
When a 1st-level branch is opened, its children fan out in an **outward radial arc** away from the branch rather than stacking backwards:
```typescript
const childCount = bNode.children.length
const arcSpread = Math.min(childCount * 55, 380)
const startArcY = bCenterY - arcSpread / 2

bNode.children.forEach((cNode, cIdx) => {
  const cCenterY = childCount === 1 ? bCenterY : startArcY + (cIdx / (childCount - 1)) * arcSpread
  const progress = (cIdx / Math.max(childCount - 1, 1)) - 0.5 // -0.5 to 0.5
  const arcOffsetX = dir * (240 + Math.abs(progress) * 40)
  const cX = bX + arcOffsetX
  // ...
})
```

---

## 5. Organic SVG Bezier Vines

Connecting vines are computed using cubic Bezier curves (`M x1 y1 C cp1x cp1y, cp2x cp2y, x2 y2`):
- **Level 1 Curves**: Emerge directly from the left/right pill edge of the root node (`startX = side === 'right' ? 75 : -75`) and terminate at `(item.x, item.y)`.
- **Level 2 & 3 Curves**: Connect from `(item.parentX, item.parentY)` to `(item.x, item.y)`.
- SVG coordinate space is aligned with `top: 0; left: 0; overflow: visible`, matching the unscaled canvas coordinate space exactly.

---

## 6. Interactive Behaviors

### 1. Auto-Center on Branch Expansion
When a user clicks any 1st-level branch pill to expand it:
```typescript
if (item.depth === 1 && item.isCollapsed) {
  setPan({ x: -item.x, y: -item.y })
}
```
The canvas smoothly translates (`transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)`) so that the clicked branch and its newly blossomed children move into the focal center of the screen.

### 2. Google-Maps-Style Zooming
The mouse wheel listener anchors zooming directly to the pointer's coordinates:
```typescript
const onWheel = (e: WheelEvent) => {
  const rect = el.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const canvasX = (mouseX - (centerX + currPan.x)) / currZoom
  const canvasY = (mouseY - (centerY + currPan.y)) / currZoom

  const factor = Math.exp(-e.deltaY * 0.002)
  const nextZoom = Math.min(Math.max(currZoom * factor, 0.25), 3.5)

  const nextPanX = mouseX - centerX - canvasX * nextZoom
  const nextPanY = mouseY - centerY - canvasY * nextZoom

  setZoom(nextZoom)
  setPan({ x: nextPanX, y: nextPanY })
}
```
Whatever word is under the cursor remains locked directly under the cursor while scrolling.

### 3. Display Modes & Audio
- **Language Modes**: `EN + CN (双语)`, `English (纯英文)`, `中文 (纯中文)` toggled via header button.
- **Node Audio**: Audio pronunciation buttons fetch textbook audio blobs via `audioCache` and play standard UK RP recordings.
