# Vocabulary Handwriting Trace Design System

## Overview
The vocabulary handwriting trace feature provides interactive penmanship tracing animations for primary school learners. It is implemented in two variants:
1. **VocabTraceModal**: An interactive popup showing one word at a time, featuring playback controls (Play/Pause, Prev/Next, and Speed).
2. **AnimatedWordSVG**: A lightweight, auto-playing loop embedded in the center of vocabulary flashcards.

## Layout & Guidelines
* **Guidelines**: 4 standard penmanship guidelines are drawn within a `120px` height container:
  - **Top Line** (`y = 25`): Solid coral/red (`#ff7675`).
  - **Middle Line** (`y = 50`): Dashed blue (`#0984e3`).
  - **Baseline** (`y = 75`): Solid blue (`#0984e3`).
  - **Bottom Line** (`y = 95`): Dashed grey (`#b2bec3`).
* **Height**: The container (`vt-board-outer`) has no fixed minimum height, allowing it to collapse snugly to the height of the guidelines (~120px + padding).
* **Controls**: The speed selector is absolutely positioned in the top-right corner of the board (`position: absolute; top: 8px; right: 8px; zIndex: 10`), keeping the footer clean and focused on media controls.

## Typography & SVG Glyphs
* **Glyph Coordinates**: Letter glyph paths are designed within a local `100x100` coordinate space and centered around `x = 50`.
* **Cursive & Bottom Curves**: Cursive details are added to specific letter stems (e.g. lowercase `l` and `t` feature bottom-right hooks) to ensure legibility and correct writing habits.
* **Kerning (Letter Spacing)**: Instead of constant character offsets, spacing is calculated using a bidirectional average:
  $$\text{Offset Step} = \frac{\text{Current Char Width} + \text{Next Char Width}}{2}$$
  - Narrow letters (e.g. `i`, `l`) are assigned small widths (`22px`-`24px`).
  - Wide letters (e.g. `m`, `w`) are assigned large widths (`44px`).
* **Word Centering**: The physical midpoint of the word is dynamically calculated and shifted to align perfectly with the SVG center (`svgWidth / 2`).

## Animation Specifications
* **Stroke Progression**: Animate drawing by transitioning CSS `stroke-dashoffset` from `200` to `0` sequentially stroke-by-stroke.
* **Stroke Hierarchy Coloring**:
  - **First Stroke**: Colored in dark charcoal (`#2d3436`) to guide the primary writing motion.
  - **Subsequent Strokes**: Colored in a lighter slate grey (`#7f8c8d`) to distinguish compound letter formations.
* **Start Direction Indicator**: A green start dot (`.vt-start-dot`, `#27ae60`) is drawn at the start coordinate of the currently animating stroke. It is hidden when the animation is paused or in its delay state.
* **Loop Sequencing**:
  1. **Writing**: Animates stroke-by-stroke sequentially.
  2. **Pause on Complete** (1.3s): The completed word is shown fully written.
  3. **Empty State Pause** (0.2s): The active paths are unmounted to clear the board instantly (bypassing the CSS transition), showing only the background trace guidelines before the next loop begins.
