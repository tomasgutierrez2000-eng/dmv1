# Drag-to-Zoom (Marquee Zoom) – Implementation Plan

## Goal
Allow the user to **drag a rectangle on the canvas** and have the view **smoothly zoom into that region**, filling the viewport. This complements existing scroll-zoom and drag-to-pan.

---

## Current Behavior (Summary)
- **Pan**: Left-click on empty canvas (or middle-click anywhere) + drag.
- **Zoom**: Mouse wheel (toward cursor); keys `+`/`-`/`0` (fit).
- **Click empty**: Clear selection and fit-to-view (base view).
- **Transform**: `translate(pan.x, pan.y) scale(zoom)` on the content `<g>`. World → screen: `screen = pan + world * zoom`; so **world = (screen - pan) / zoom**.

---

## Recommended UX: Shift + Drag for Marquee Zoom
- **Trigger**: **Hold Shift**, then drag on the canvas (including over content) to draw a selection rectangle. On release, animate zoom/pan so that the selected region fills the viewport (with padding).
- **Rationale**:
  - Keeps **left-drag = pan** and **middle-drag = pan** unchanged.
  - No conflict with table drag (table drag starts from a table; marquee starts from empty or from content with Shift).
  - Matches common patterns (e.g. mapping tools, diagram editors) where a modifier enables “zoom to region”.
- **Alternative** (if you prefer no modifier): Use **right-drag** for marquee zoom (right-click drag). Then left-drag remains pan; right-drag = zoom to region. Requires ensuring right-drag doesn’t open context menu (already prevented in your app).

---

## What to Implement

### 1. State (Canvas.tsx)
- `marqueeStart: { x: number, y: number } | null` – start of drag (viewport/screen coordinates).
- `marqueeCurrent: { x: number, y: number } | null` – current mouse position during drag (viewport/screen coordinates).
- When both are set and different enough, show the selection rectangle and on mouse up perform zoom-to-region.

### 2. Input Handling
- **Mouse down**: If **Shift** is held and target is canvas (or the main content `<g>`), set `marqueeStart` and `marqueeCurrent` to `(e.clientX - rect.left, e.clientY - rect.top)` (relative to container), and **do not** start pan or table drag.
- **Mouse move**: If marquee is active, update `marqueeCurrent`; optionally normalize so the rect is always “positive” (min/max) for drawing.
- **Mouse up**: If marquee was active and the drawn rect has minimum size (e.g. 10×10 px):
  - Convert marquee rect from **screen** to **world** coordinates:
    - `worldLeft = (screenLeft - pan.x) / zoom`
    - `worldTop = (screenTop - pan.y) / zoom`
    - Same for right/bottom using current `pan` and `zoom`.
  - Compute **new zoom** and **pan** so that the world rect fills the viewport (with padding, e.g. 40px):
    - `newZoom = min(viewportWidth / worldWidth, viewportHeight / worldHeight)` (accounting for padding), then clamp to your zoom limits (e.g. 0.05–4).
    - Center the world rect in the viewport:  
      `newPan.x = -worldCenterX * newZoom + viewportWidth/2`,  
      `newPan.y = -worldCenterY * newZoom + viewportHeight/2`.
  - Set `isAnimating(true)`, then `setZoom(newZoom)` and `setPan(newPan)`, clear `marqueeStart` and `marqueeCurrent`, and after ~300ms set `isAnimating(false)`.
- If Shift is not held, keep existing behavior (pan on empty canvas, etc.).

### 3. Drawing the Marquee
- Render a rectangle in **screen space** so it doesn’t scale with the canvas (fixed stroke width, correct placement). Options:
  - **Option A**: A `<div>` overlay on top of the SVG, positioned with `position: absolute`, using `left/top/width/height` from the normalized marquee rect (relative to the container). Prefer this for crisp edges and easy styling.
  - **Option B**: An SVG `<rect>` in a separate layer that uses the container’s coordinate system (no transform), so coordinates are still in screen space.
- Style: Semi-transparent fill (e.g. `rgba(59, 130, 246, 0.15)`), clear border (e.g. `1.5px solid rgb(59, 130, 246)`), slight border-radius for polish. Match your app’s accent if desired.

### 4. Coordinate Math (Details)
- Container rect: `containerRef.current.getBoundingClientRect()` (or store `rect.left`, `rect.top` on mousedown for consistency).
- Screen position relative to container: `sx = e.clientX - rect.left`, `sy = e.clientY - rect.top`.
- World from screen: `wx = (sx - pan.x) / zoom`, `wy = (sy - pan.y) / zoom`.
- To fit world rect `(wMinX, wMinY, wWidth, wHeight)` in viewport `(vpW, vpH)` with padding `P`:
  - `zoomX = (vpW - 2*P) / wWidth`, `zoomY = (vpH - 2*P) / wHeight`, `newZoom = min(zoomX, zoomY)` clamped.
  - Center: `wCx = wMinX + wWidth/2`, `wCy = wMinY + wHeight/2`.
  - `newPan.x = -wCx * newZoom + vpW/2`, `newPan.y = -wCy * newZoom + vpH/2`.

### 5. Edge Cases
- **Very small drag**: If marquee diagonal &lt; ~10px, treat as click (don’t zoom); clear marquee and optionally run existing “click empty” behavior (fit-to-view) if click was on empty space.
- **Zoom limits**: Clamp `newZoom` to your store’s range (e.g. 0.05–4). If the store’s `setZoom` clamps to 0.1–3, consider relaxing the upper bound for marquee zoom so users can zoom into small areas.
- **Escape**: On keydown `Escape`, cancel marquee (clear `marqueeStart` / `marqueeCurrent`) without zooming.
- **Mouse leave**: If mouse leaves the container during marquee, cancel marquee on `mouseleave` (same as `handleMouseUp` clearing pan/drag).

### 6. Accessibility & Discoverability
- **Hint**: Add to the existing hint bar: “Shift+drag to zoom to region” (or “Right-drag to zoom to region” if you use that variant).
- **Shortcuts**: Document in the `?` shortcuts panel if you have one.
- **Reduced motion**: If `prefers-reduced-motion: reduce`, skip the zoom/pan transition (instant jump) or use a very short duration, same as your current `isAnimating` behavior.

### 7. Testing
- Shift+drag on empty area → zoom into that region.
- Shift+drag over tables/lines → same; marquee is in screen space so it’s independent of content.
- Small Shift+drag → no zoom (or treat as click).
- Escape during drag → marquee cancels.
- After zoom-to-region, scroll zoom and pan still work; fit-to-view and double-click fit still work.

---

## Files to Touch
| File | Changes |
|------|--------|
| `components/visualizer/Canvas.tsx` | Add marquee state, Shift-aware mousedown/move/up, marquee rect overlay, zoom-to-region math and animation. |
| `store/modelStore.ts` | Optional: relax `setZoom` max (e.g. 4) for marquee zoom. |
| Hint / shortcuts UI | Add “Shift+drag to zoom to region”. |

---

## Value to User
- **Precision**: Zoom exactly into a cluster of tables or a domain without multiple scroll-zooms and pans.
- **Speed**: One gesture (draw a box) instead of scroll + pan + scroll.
- **Consistency**: Same mental model as “select a region” in many professional tools (Figma, mapping, DAW timelines).

The standalone demo in `demo/drag-zoom-demo.html` illustrates the interaction and animation so you can try it before wiring into the main app.
