# L3 Metric View - Visual Reference Guide

## Color Scheme Reference

### Layer Colors (Data Lineage Nodes)

| Layer | Color | Hex | Background | Border | Text | Usage |
|-------|-------|-----|------------|--------|------|-------|
| **L1** | Blue | `#3b82f6` | `bg-blue-950/60` | `border-blue-500/40` | `text-blue-300` | Reference data (master tables) |
| **L2** | Amber | `#f59e0b` | `bg-amber-950/60` | `border-amber-500/40` | `text-amber-300` | Snapshot data (monthly) |
| **L3** | Emerald | `#10b981` | `bg-emerald-950/60` | `border-emerald-500/40` | `text-emerald-300` | Derived metrics (output) |
| **Transform** | Purple | `#a855f7` | `bg-purple-950/60` | `border-purple-500/40` | `text-purple-300` | Calculations/operations |

### Dimension Interaction Colors

| Type | Color | Background | Text | Meaning |
|------|-------|------------|------|---------|
| **FILTER** | Blue | `bg-blue-500/20` | `text-blue-300` | Dimension used to filter data |
| **GROUP_BY** | Green | `bg-emerald-500/20` | `text-emerald-300` | Dimension used for grouping/aggregation |
| **AVAILABLE** | Gray | `bg-gray-500/20` | `text-gray-400` | Dimension available but not actively used |
| **TOGGLE** | Amber | `bg-amber-500/20` | `text-amber-300` | Dimension controlled by toggle switch |

### Page Accent Colors

| Page | Color | Hex | Theme |
|------|-------|-----|-------|
| **P1** Executive | Red | `#ef4444` | High-priority KPIs |
| **P2** Exposure | Blue | `#3b82f6` | Financial exposure |
| **P3** Concentration | Emerald | `#10b981` | Limits & concentration |
| **P4** Legal/DQ | Purple | `#8b5cf6` | Compliance & quality |
| **P5** Stress | Cyan | `#06b6d4` | Risk & stress testing |
| **P6** Facilities | Amber | `#f59e0b` | Operational tracking |
| **P7** Portfolio | Pink | `#ec4899` | Portfolio analytics |

---

## Component Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER WINDOW                          │
├──────────────┬──────────────────────────────────────────────────┤
│   SIDEBAR    │              MAIN CONTENT AREA                   │
│   (224px)    │                                                  │
│              │  ┌────────────────────────────────────────────┐  │
│  ┌────────┐  │  │  STICKY HEADER                            │  │
│  │ Back   │  │  │  • Page icon & name                       │  │
│  │ Title  │  │  │  • Description                            │  │
│  └────────┘  │  │  • Stats (metrics count, lineage count)   │  │
│              │  │  • Search box                             │  │
│  ┌────────┐  │  └────────────────────────────────────────────┘  │
│  │ P1 ●   │  │                                                  │
│  │ P2     │  │  ┌────────────────────────────────────────────┐  │
│  │ P3     │  │  │  TOGGLE BAR (if page has toggles)         │  │
│  │ P4     │  │  │  • Amber background                       │  │
│  │ P5     │  │  │  • Toggle switches                        │  │
│  │ P6     │  │  └────────────────────────────────────────────┘  │
│  │ P7     │  │                                                  │
│  └────────┘  │  ┌────────────────────────────────────────────┐  │
│              │  │  METRIC TYPE LEGEND                       │  │
│  ┌────────┐  │  │  • Icons for each metric type             │  │
│  │ Legend │  │  │  • Purple dot = has lineage               │  │
│  │ L1 ■   │  │  └────────────────────────────────────────────┘  │
│  │ L2 ■   │  │                                                  │
│  │ TX ■   │  │  ┌────────────────────────────────────────────┐  │
│  │ L3 ■   │  │  │  SECTION: Header                          │  │
│  └────────┘  │  │  ┌──────────────────────────────────────┐  │  │
│              │  │  │  METRIC CARD (collapsed)             │  │  │
│              │  │  │  [ID] [Icon] Name  Formula  Value  ● │  │  │
│              │  │  └──────────────────────────────────────┘  │  │
│              │  │  ┌──────────────────────────────────────┐  │  │
│              │  │  │  METRIC CARD (expanded)              │  │  │
│              │  │  │  • Description                       │  │  │
│              │  │  │  • Formula box                       │  │  │
│              │  │  │  • Source fields                     │  │  │
│              │  │  │  • Dimensions                        │  │  │
│              │  │  │  • Toggles                           │  │  │
│              │  │  │  • Lineage DAG (SVG)                 │  │  │
│              │  │  │  • Equation breakdown                │  │  │
│              │  │  └──────────────────────────────────────┘  │  │
│              │  └────────────────────────────────────────────┘  │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## Metric Card States

### Collapsed State
```
┌────────────────────────────────────────────────────────────────┐
│ [M007] [#] Utilization %  Ratio  current÷limit×100  84.0%  ● ▶│
└────────────────────────────────────────────────────────────────┘
   │      │   │             │      │                   │      │ │
   ID    Icon Name          Type   Formula            Value  L  Chevron
                                   (hidden mobile)           Lineage
```

### Expanded State
```
┌────────────────────────────────────────────────────────────────┐
│ [M007] [#] Utilization %  Ratio  current÷limit×100  84.0%  ● ▼│
├────────────────────────────────────────────────────────────────┤
│ Description: How much of the limit is being used...           │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ FORMULA                                                  │  │
│ │ current_value ÷ limit_value × 100                        │  │
│ │ SQL: SUM(fes.gross_exposure_usd) / lr.limit_amount * 100│  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ATOMIC SOURCE FIELDS                                           │
│ [L2] facility_exposure_snapshot.gross_exposure_usd  $4.2B     │
│ [L1] limit_rule.limit_amount  $5.0B                           │
│                                                                │
│ DIMENSIONS                                                     │
│ [Filter: As-of Date] [Filter: Metric]                         │
│                                                                │
│ DATA LINEAGE FLOW                                              │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │  [L2]──────▶[TX]──────▶[L3]                              │  │
│ │  gross      divide     util                              │  │
│ │  $4.2B      ÷          84.0%                             │  │
│ │             ▲                                            │  │
│ │  [L1]───────┘                                            │  │
│ │  limit                                                   │  │
│ │  $5.0B                                                   │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ EQUATION BREAKDOWN (SAMPLE DATA)                               │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │  ┌────────┐    ÷    ┌────────┐    =    ┌──────────┐    │  │
│ │  │ $4.2B  │         │ $5.0B  │         │  84.0%   │    │  │
│ │  │ gross  │         │ limit  │         │  util    │    │  │
│ │  └────────┘         └────────┘         └──────────┘    │  │
│ └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## SVG Lineage Flow Details

### Node Structure
```
┌────────────────────────┐
│ [L2] L2 Snapshot       │  ← Layer badge (colored)
│ facility_exposure_...  │  ← Table name (gray, small)
│ gross_exposure_usd     │  ← Field name (white, bold)
│ $4.2B                  │  ← Sample value (emerald)
└────────────────────────┘
     200px × 72px
```

### Edge Types
- **Solid curved lines** with bezier curves
- **Arrowheads** at destination end
- **Labels** centered on path (e.g., "÷", "×", "SUM", "→")
- **Hover effect**: Connected edges highlight in layer color
- **Animation**: Staggered fade-in (60ms delay per edge)

### Layout Algorithm
- **Columns**: L1 → L2 → Transform → L3 (left to right)
- **Column gap**: 60px
- **Row gap**: 16px
- **Vertical centering**: Shorter columns centered relative to tallest
- **Special case**: L3 source nodes (with outgoing edges) moved to column 1

---

## Toggle Bar (P3, P4, P6)

```
┌────────────────────────────────────────────────────────────────┐
│ [⇄] TOGGLES  Exposure Calc: [Gross] [Net]                     │
│                               ^^^^^^  ^^^^                     │
│                               active  inactive                 │
└────────────────────────────────────────────────────────────────┘
  │            │              │
  Icon       Label          Toggle buttons (pill-style)
  
Background: bg-amber-500/[0.04]
Border: border-amber-500/10
Active button: bg-amber-500/20 text-amber-300
Inactive button: text-gray-500
```

---

## Dimension Badge Examples

```
[Filter: As-of Date]        ← Blue background, blue text
[Group By: Counterparty]    ← Green background, green text
[Available: Region]         ← Gray background, gray text
[Toggle: Exposure Calc]     ← Amber background, amber text
```

---

## Metric Type Icons

| Type | Icon | Usage |
|------|------|-------|
| **Aggregate** | # (Hash) | SUM, COUNT, etc. |
| **Ratio** | ↗ (TrendingUp) | Percentages, rates |
| **Count** | ⊞ (Grid3x3) | Record counts |
| **Derived** | ⚡ (Zap) | Calculated metrics |
| **Status** | ⚠ (AlertTriangle) | Status flags |
| **Trend** | ↗ (TrendingUp) | Time series |
| **Table** | ⊞ (Table2) | Detail tables |
| **Categorical** | 🏷 (Tag) | Categories |

---

## Responsive Behavior

### Desktop (> 768px)
- Sidebar: 224px fixed width
- Formula preview visible in collapsed cards
- Full lineage DAG width
- Multi-column equation breakdown

### Mobile (< 768px)
- Sidebar: Collapsible/overlay
- Formula preview hidden
- Lineage DAG: Horizontal scroll
- Single-column equation breakdown

---

## Animation Timings

| Element | Duration | Easing | Delay |
|---------|----------|--------|-------|
| **Card expand** | 300ms | cubic-bezier(0.16,1,0.3,1) | 0ms |
| **SVG edges** | 400ms | ease | 60ms per edge (stagger) |
| **Node fade-in** | 300ms | cubic-bezier(0.16,1,0.3,1) | 50ms per node (stagger) |
| **Hover highlight** | 200ms | ease | 0ms |
| **Page transition** | 200ms | ease | 0ms |

---

## Hover States

### Node Hover
- **Target node**: Scale 1.03, z-index 10, shadow-lg
- **Connected edges**: Highlight in layer color, stroke-width 2
- **Connected nodes**: Normal opacity
- **Unconnected**: Opacity 0.15 (dimmed)
- **Tooltip**: Shows description + sample value below node

### Edge Hover
- No direct interaction (edges respond to node hover)

### Card Hover (collapsed)
- Background: `hover:bg-white/[0.02]`
- Border: `hover:border-white/10`

### Sidebar Item Hover
- Background: `hover:bg-white/[0.02]`

---

## Key Metrics with Visual Lineage

| Metric ID | Name | Page | Nodes | Complexity |
|-----------|------|------|-------|------------|
| **M007** | Utilization % | P1 | 4 | Simple ratio |
| **M008** | Velocity (30d) | P1 | 4 | Delta calculation |
| **M017** | Gross Exposure | P2 | 4 | Simple aggregation |
| **M020** | Net Exposure | P2 | 5 | Subtraction with collateral |
| **M021** | Coverage Ratio | P2 | 4 | Ratio with netting |
| **M030** | Probability of Default | P2 | 6 | Weighted average |
| **M032** | Expected Loss | P2 | 8 | **Complex multi-step** |
| **M034** | Limit Utilization % | P3 | 5 | Ratio with threshold |
| **M095** | Utilization % | P7 | 4 | Portfolio-level ratio |

---

## Testing Priority

### Critical (Must Work)
1. ✅ SVG lineage rendering (lines, arrows, nodes)
2. ✅ Dimension badge colors (blue/green/gray/amber)
3. ✅ Toggle bar on P3, P4, P6
4. ✅ Search filtering
5. ✅ Card expand/collapse

### Important (Should Work)
1. ✅ Hover effects on lineage nodes
2. ✅ Equation breakdown display
3. ✅ Page navigation
4. ✅ Layer legend
5. ✅ Responsive layout

### Nice to Have (Can Defer)
1. ✅ Animation timings
2. ✅ Tooltip positioning
3. ✅ Mobile optimization
4. ✅ Performance optimization

---

## Common Issues to Watch For

### SVG Rendering
- ❌ Lines not appearing → Check SVG viewBox and dimensions
- ❌ Arrows missing → Check marker definitions and references
- ❌ Lines overlapping nodes → Check z-index (SVG below, HTML above)

### Layout
- ❌ Nodes overlapping → Check layout algorithm column assignment
- ❌ Text truncation → Check max-width and overflow settings
- ❌ Misaligned badges → Check flex/inline-flex settings

### Colors
- ❌ Wrong dimension colors → Check DIM_INTERACTION_STYLE mapping
- ❌ Layer colors not matching → Check LAYER_STYLE definitions
- ❌ Low contrast → Check opacity values (should be visible on dark bg)

### Interactions
- ❌ Hover not working → Check pointer-events and z-index
- ❌ Toggle not switching → Check state management
- ❌ Search not filtering → Check search query logic

---

## Browser Compatibility

Tested on:
- [ ] Chrome 120+ ✅
- [ ] Firefox 120+ ✅
- [ ] Safari 17+ ✅
- [ ] Edge 120+ ✅

Known issues:
- Safari: SVG marker rendering may have slight differences
- Firefox: Backdrop-blur may not work on older versions
