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

### Canonical Reference Case: A7A Unit 3 (`a7a-u3-vocab-guide.json`)
Root: `My School` (`🏫`) with 6 major branch petals (`N = 6`):
1. **`places`** (`Campus Buildings & Places`, `🏢`): 8 depth-2 children.
   - Single-child depth-3 nodes: `sports field` (`🏃`) -> `field` (`⛳`), `student centre` (`🎯`) -> `centre` (`🔘`).
   - Multi-child depth-3 node: `floating school` (`⛵`) -> `rainy season` (`🌧️`), `sunlight` (`☀️`), `fresh air` (`🍃`).
2. **`classroom`** (`Inside the Classroom`, `🪑`): 9 depth-2 children.
   - Single-child depth-3 node: `reading corner` (`📖`) -> `bookcase` (`📚`).
3. **`positions`** (`Spatial Locations`, `📍`): 6 depth-2 children.
4. **`activities`** (`School Activities`, `🏃`): 7 depth-2 children.
5. **`descriptions`** (`Descriptions & Traits`, `✨`): 9 depth-2 children.
6. **`misc`** (`Others / Misc`, `📦`): 6 depth-2 children.

---

## 2. Coordinate System

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

## 3. Radial Flower Layout

- **Petals (`depth = 1`)**: evenly spread around the root, starting at 12 o'clock: `angle_i = -π/2 + i·2π/N`.
- **Sub-flower (`depth = 2`)**: an open branch's `n` children sit on `n+1` slots of a compact ellipse (`rx:ry ≈ 1.2:0.85`, cards ≈ 160×48, branch ≈ 230×48); the root-facing slot stays empty for the stem.
- **Depth 3 (Sub-words)**: 
  - **Single child** (e.g. `reading corner` -> `bookcase`, `sports field` -> `field`, `student centre` -> `centre`): extends radially outward along the parent's radial angle at distance `+140px`.
  - **Multiple children** (e.g. `floating school` -> `rainy season`, `sunlight`, `fresh air`): arranged into an outward vertical column on the outward side (`colGap = 190px`, `rowGap = 62px`) centered around the parent card's Y position so each sub-item has its own dedicated card slot with zero overlap.
- **Magnetic Repulsion (Same Pole)**: every branch—whether open or collapsed—acts as a physical body with a magnetic repulsion field. When an open sub-flower's cards approach an adjacent branch (even a collapsed petal), both branches naturally repel each other:
  - **Angular parting ($\Delta \theta$)**: petals part sideways along the circle ring.
  - **Radial push ($\Delta r$)**: branches gently push outward away from the root.
  This prevents any sub-flower card from covering adjacent collapsed petals while keeping the overall layout as tight and compact as possible.
- **Anchoring & Centering**: 
  - The anchor element (`.vmm-radial-node-anchor`) has `position: absolute; top: 0; left: 0; width: 0; height: 0; pointer-events: none;`. It must **NOT** have flexbox centering (`display: flex; align-items: center; justify-content: center`), because flexbox in a 0×0 container already centers the child at `(0, 0)`, and adding `transform: translate(-50%, -50%)` would double-shift the node up and left, causing lines to attach to the bottom-right corner.
  - The capsule (`.vmm-node-capsule`) uses `position: absolute; top: 0; left: 0; transform: translate(-50%, -50%);`. This guarantees that its visual center `(W/2, H/2)` sits with mathematical precision at `(item.x, item.y)` so that all connecting SVG vines attach to the exact center of every node.

---

## 4. SVG Stems & Vines

- **Layer Sizing**: The `<svg className="vmm-vines-layer">` uses `viewBox="-4000 -4000 8000 8000"` with `top: -4000px; left: -4000px; width: 8000px; height: 8000px` so origin `(0, 0)` is locked to the root node center and SVG paths are reliably rendered across all browsers.
- **Root-to-Branch Vines (`depth = 1`)**: Graceful quadratic Bézier curve with a subtle 4% organic normal offset. Kept within $\approx 4.5^\circ$ deflection so it stays strictly within its own $60^\circ$ sector, never crosses adjacent petals, and enters each petal capsule cleanly without poking past the rounded corners (`strokeWidth: 3.5px` and shadow).
- **Sub-flower Stems (`depth = 2 / 3`)**: Quadratic Bézier stems with an organic 5% normal offset connecting parent nodes to child vocabulary words (`depth = 2` strokeWidth: `2.2px`, `depth = 3` strokeWidth: `1.6px`). Both ends connect precisely to the geometric center of the node capsules.



## 5. Interactive Behaviors

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
