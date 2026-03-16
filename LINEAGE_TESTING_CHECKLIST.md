# L3 Metric View - Testing Checklist

## Test URL
`http://localhost:3000/lineage`

---

## Test 1: Initial View - Sidebar & P1 Metrics

**Expected:**
- Left sidebar shows P1-P7 pages with icons and metric counts
- P1 "Executive Summary" is selected by default (red accent)
- Main area shows P1 metrics grouped by section
- Each metric card shows: ID badge, type icon, name, formula preview, sample value
- Purple dot indicator on metrics with visual lineage

**Screenshot Required:** ✅ Initial page load

**Checks:**
- [ ] Sidebar displays all 7 pages (P1-P7) with correct icons
- [ ] P1 is highlighted with red left border
- [ ] Metric counts shown for each page (e.g., "P1 · 6 metrics")
- [ ] Layer legend at bottom of sidebar (L1, L2, transform, L3)
- [ ] Search box visible in header
- [ ] Page stats show "X metrics" and "Y with lineage"

---

## Test 2: Expand M007 - Utilization %

**Action:** Click on "M007: Utilization %" card to expand

**Expected:**
- Card expands with smooth animation
- Shows full description
- Formula box with purple text: `current_value ÷ limit_value × 100`
- Atomic Source Fields section with 2 fields:
  - L2: facility_exposure_snapshot.gross_exposure_usd ($4.2B)
  - L1: limit_rule.limit_amount ($5.0B)
- Dimensions section with 2 badges:
  - Filter: As-of Date (blue)
  - Filter: Metric (blue)
- **Data Lineage Flow** section with SVG visualization:
  - 4 nodes arranged horizontally
  - Curved bezier lines connecting them with arrows
  - Nodes colored by layer (L2=amber, L1=blue, transform=purple, L3=emerald)
  - Hover effects on nodes and edges
- **Equation Breakdown** showing: $4.2B ÷ $5.0B = 84.0%

**Screenshot Required:** ✅ Expanded M007 card

**Checks:**
- [ ] SVG lines render correctly (not broken/missing)
- [ ] Arrows appear at end of each edge
- [ ] Node colors match layer (blue for L1, amber for L2, purple for transform, emerald for L3)
- [ ] Hover on node highlights connected edges
- [ ] Equation breakdown shows sample values with correct math
- [ ] Formula box has dark background with purple formula text

---

## Test 3: Navigate to P2 - Exposure

**Action:** Click "P2: Exposure" in sidebar

**Expected:**
- Sidebar highlights P2 with blue left border
- Header updates to show P2 icon (💰) and "Exposure Composition"
- Metrics grouped into sections:
  - Exposure Summary
  - Coverage Breakdown
  - Composition Charts
  - Counterparty Tables
  - Risk Distribution
  - Risk Metrics
  - Trends
- Toggle bar **should NOT appear** (P2 has toggles in data but they're for individual metrics)

**Screenshot Required:** ✅ P2 page view

**Checks:**
- [ ] Page transition is smooth
- [ ] Search box clears automatically
- [ ] Metric count updates in header
- [ ] Section headers show with blue accent bar
- [ ] No toggle bar visible (toggles are metric-specific, not page-level)

---

## Test 4: Expand M032 - Expected Loss (Complex DAG)

**Action:** On P2, scroll to "M032: Expected Loss" and expand it

**Expected:**
- Complex multi-step lineage DAG with 8 nodes:
  - L2: pd_estimate, lgd_estimate, funded_amount, unfunded_amount, ccf
  - Transform: EAD calculation, EL calculation
  - L3: total_expected_loss
- Multiple edges showing data flow:
  - funded + (unfunded × CCF) → EAD
  - PD × LGD × EAD → EL per facility
  - SUM(EL) → total_expected_loss
- Equation breakdown showing the calculation with sample values
- Formula: `SUM(PD × LGD × EAD)`

**Screenshot Required:** ✅ Expanded M032 with complex lineage

**Checks:**
- [ ] All 8 nodes visible and properly positioned
- [ ] Multiple edges connecting nodes in correct flow
- [ ] Edge labels visible (×, +, SUM, etc.)
- [ ] No overlapping nodes or edges
- [ ] Hover highlights work correctly for multi-path connections
- [ ] Equation breakdown shows all intermediate steps

---

## Test 5: Search Functionality

**Action:** Type "coverage" in search box

**Expected:**
- Metrics filter in real-time as you type
- Should show metrics containing "coverage" in name, ID, formula, or description:
  - M021: Coverage Ratio
  - M022: % Covered by Collateral
  - M023: % Covered by Guarantee
  - M060: Stress Test Coverage
  - M100: Coverage Rate %
- Other metrics disappear
- Section headers remain but show filtered count
- Clear button (X) appears in search box

**Screenshot Required:** ✅ Search results for "coverage"

**Checks:**
- [ ] Search filters immediately (no lag)
- [ ] Correct metrics shown across multiple pages
- [ ] Empty sections are hidden
- [ ] Clear button (X) visible and functional
- [ ] Clicking X restores all metrics

---

## Test 6: P3 - Concentration (Toggle Bar)

**Action:** Click "P3: Concentration" in sidebar

**Expected:**
- Toggle bar appears at top of metrics section with amber background
- Toggle icon and "TOGGLES" label visible
- One toggle displayed: "Exposure Calc: Gross / Net"
- Default selected: "Gross" (amber highlight)
- Clicking "Net" switches the active state
- Metrics below show green emerald accent

**Screenshot Required:** ✅ P3 with toggle bar visible

**Checks:**
- [ ] Toggle bar has amber background (bg-amber-500/[0.04])
- [ ] Toggle icon (ToggleLeft) visible
- [ ] Toggle buttons have rounded pill design
- [ ] Active state shows amber background
- [ ] Inactive state shows gray text
- [ ] Toggle is clickable and switches state

---

## Test 7: Expand M034 - Limit Utilization % (P3)

**Action:** On P3, expand "M034: Limit Utilization %"

**Expected:**
- Lineage DAG with 5 nodes:
  - L2: gross_exposure_usd ($890M)
  - L1: limit_amount ($1.1B)
  - L1: inner_threshold_pct (85%)
  - Transform: utilization calculation
  - L3: limit_utilization_pct (78.3%)
- Shows threshold checking in the flow
- Dimensions section shows 5 dimensions:
  - FILTER: As-of Date (blue)
  - GROUP_BY: Line of Business (green)
  - GROUP_BY: Industry (green)
  - AVAILABLE: Counterparty (gray)
  - AVAILABLE: Limit Status (gray)
- Toggles section shows "Exposure Calc Toggle: Gross / Net"

**Screenshot Required:** ✅ Expanded M034 with lineage

**Checks:**
- [ ] Dimension badges color-coded correctly:
  - Blue for FILTER
  - Green for GROUP_BY
  - Gray for AVAILABLE
  - Amber for TOGGLE (if present)
- [ ] Toggle badge shows with amber background
- [ ] Lineage flow includes threshold node
- [ ] All node labels readable and not truncated

---

## Visual Quality Checks

### Layout & Spacing
- [ ] No overlapping text or elements
- [ ] Consistent padding and margins
- [ ] Cards align properly in grid
- [ ] Section headers have proper spacing

### Typography
- [ ] All text readable (no truncation issues)
- [ ] Font sizes appropriate (not too small)
- [ ] Monospace font used for formulas and values
- [ ] Proper text hierarchy (headers vs body)

### Colors & Contrast
- [ ] Layer colors distinct and visible:
  - L1: Blue (#3b82f6)
  - L2: Amber (#f59e0b)
  - L3: Emerald (#10b981)
  - Transform: Purple (#a855f7)
- [ ] Dimension interaction colors correct:
  - FILTER: Blue
  - GROUP_BY: Green
  - AVAILABLE: Gray
  - TOGGLE: Amber
- [ ] Text readable on dark background
- [ ] Hover states visible and smooth

### SVG Lineage Rendering
- [ ] All SVG lines render (not broken)
- [ ] Bezier curves smooth (not jagged)
- [ ] Arrowheads appear at line ends
- [ ] Lines don't overlap nodes
- [ ] Edge labels positioned correctly (centered on path)
- [ ] Animations smooth (fade-in, stagger effect)

### Interactive Elements
- [ ] Hover effects work on all nodes
- [ ] Connected edges highlight on node hover
- [ ] Dimming effect works for unconnected nodes
- [ ] Expand/collapse chevron rotates
- [ ] Buttons have hover states
- [ ] Sidebar items highlight on hover

---

## Performance Checks

- [ ] Page loads quickly (< 2 seconds)
- [ ] Sidebar navigation instant
- [ ] Search filters without lag
- [ ] Card expand/collapse smooth
- [ ] SVG animations don't stutter
- [ ] No console errors in browser DevTools

---

## Cross-Page Navigation Test

**Action:** Navigate through all 7 pages in sequence

**Pages to Test:**
1. [ ] P1: Executive Summary (red) - 6 metrics
2. [ ] P2: Exposure (blue) - 17 metrics
3. [ ] P3: Concentration (green) - 6 metrics, **has toggle bar**
4. [ ] P4: Legal / DQ (purple) - 3 metrics, **has toggle bar**
5. [ ] P5: Stress (cyan) - 5 metrics
6. [ ] P6: Facilities (amber) - 7 metrics, **has toggle bar**
7. [ ] P7: Portfolio (pink) - 13 metrics

**Checks for Each Page:**
- [ ] Correct accent color applied
- [ ] Correct icon displayed
- [ ] Metric count matches
- [ ] Toggle bar appears only on P3, P4, P6
- [ ] Section grouping works correctly
- [ ] At least one metric has visual lineage (purple dot)

---

## Known Features to Verify

### Metric Cards (Collapsed State)
- [ ] ID badge (e.g., "M007") in monospace font
- [ ] Type icon (Hash, TrendingUp, etc.)
- [ ] Metric name and type label
- [ ] Formula preview (hidden on mobile)
- [ ] Sample value in emerald color
- [ ] Purple dot for metrics with lineage
- [ ] Chevron icon (right when collapsed, down when expanded)

### Metric Cards (Expanded State)
- [ ] Description paragraph
- [ ] Formula box with dark background
- [ ] SQL formula (if available)
- [ ] Atomic Source Fields with layer badges
- [ ] Dimensions with color-coded interaction types
- [ ] Toggles section (if applicable)
- [ ] Data Lineage Flow (if available)
- [ ] Equation Breakdown (if available)

### Sidebar
- [ ] "Back" link to /overview
- [ ] "L3 Metric View" title with icon
- [ ] All 7 pages listed
- [ ] Active page highlighted
- [ ] Metric counts shown
- [ ] Layer legend at bottom
- [ ] Scrollable if content overflows

### Header
- [ ] Page icon and name with accent color
- [ ] Page description
- [ ] Stats: "X metrics", "Y with lineage"
- [ ] "ERD" link to /visualizer
- [ ] Search box with icon
- [ ] Sticky positioning on scroll

---

## Bug Report Template

If you find issues, document them as:

**Issue:** [Brief description]
**Page:** [P1-P7]
**Metric:** [Metric ID if applicable]
**Expected:** [What should happen]
**Actual:** [What actually happens]
**Screenshot:** [Attach screenshot]
**Browser:** [Chrome/Firefox/Safari version]

---

## Summary Report Template

After testing, provide:

1. **Sidebar Navigation:** ✅ / ⚠️ / ❌
2. **Lineage DAG Rendering:** ✅ / ⚠️ / ❌
3. **Equation Breakdowns:** ✅ / ⚠️ / ❌
4. **Toggle Bar (P3, P4, P6):** ✅ / ⚠️ / ❌
5. **Dimension Badges:** ✅ / ⚠️ / ❌
6. **Visual Quality:** ✅ / ⚠️ / ❌
7. **Overall Usability:** ✅ / ⚠️ / ❌

**Key Strengths:**
- [List what works well]

**Issues Found:**
- [List any problems]

**Recommendations:**
- [Suggested improvements]
