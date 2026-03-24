# Design System — Bank Data Model

## Product Context
- **What this is:** GSIB banking data model visualization platform with metrics calculation engine
- **Who it's for:** Banking professionals — risk managers, data architects, compliance teams, CRO office
- **Space/industry:** Financial data platforms (peers: Bloomberg Terminal, Palantir Foundry, dbt Cloud, Looker)
- **Project type:** Internal enterprise data exploration tool / dashboard

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian — function-first, data-dense, monospace accents, muted palette
- **Decoration level:** Intentional — subtle texture (noise overlay), dark glass/blur effects on nav. Not minimal (feels like a prototype), not expressive (undermines credibility with banking users)
- **Mood:** Serious financial tooling with technical precision. The product should feel like a control room, not a consumer app. Bloomberg Terminal heritage — amber/orange on black — signals authority and data fluency.
- **Reference sites:** Bloomberg Terminal (black + amber, proprietary monospace, extreme density), Palantir Blueprint (React component system, dark theme), dbt Cloud (developer-facing, dark mode, IDE-like)

## Typography
- **Display/Hero:** Space Mono Bold — signals technical precision, echoes Bloomberg Terminal monospace heritage
- **Body:** Inter — excellent UI text readability, widely supported, clean at small sizes
- **UI/Labels:** Inter (same as body)
- **Data/Tables:** Space Mono — consistent monospace across all technical contexts
- **Code:** Space Mono — SQL formulas, metric IDs, field names
- **Loading:** Google Fonts via `next/font/google` (already configured in layout.tsx)
- **Scale:**
  - `3xl`: 36px / 2.25rem — page hero headings
  - `2xl`: 28px / 1.75rem — section headings, stat card values
  - `xl`: 20px / 1.25rem — section titles, card headings
  - `lg`: 16px / 1rem — body text, descriptions
  - `base`: 14px / 0.875rem — UI text, form labels
  - `sm`: 13px / 0.8125rem — table cells, secondary text
  - `xs`: 11px / 0.6875rem — nav pills, badges, captions
  - `2xs`: 10px / 0.625rem — section labels, metadata

## Color
- **Approach:** Restrained — one accent (PwC orange) + warm grays. Color is rare and meaningful, used for layer coding, status indicators, and CTAs. Not decorative.
- **Primary:** `#D04A02` (PwC orange) — CTAs, active states, brand moments, nav accent
- **Secondary:** `#E87722` (lighter orange) — hover states, warm highlights
- **Neutrals:** Tailwind slate scale (warm undertone)
  - `slate-950`: `#020617` (deepest background)
  - `slate-900`: `#0f172a` (primary surface)
  - `slate-800`: `#1e293b` (secondary surface, borders)
  - `slate-700`: `#334155` (elevated surface, dividers)
  - `slate-600`: `#475569` (muted text)
  - `slate-500`: `#64748b` (dim text, placeholders)
  - `slate-400`: `#94a3b8` (secondary text)
  - `slate-300`: `#cbd5e1` (primary text on dark)
  - `slate-50`: `#f8fafc` (primary text, headings)
- **Data Layer Colors** (used consistently across all UI for L1/L2/L3 identification):
  - L1 Reference: `#14b8a6` (teal-500) — teal signals "grounded, stable" matching reference data
  - L2 Atomic: `#8b5cf6` (violet-500) — violet signals "raw, energetic" matching snapshot data
  - L3 Derived: `#f43f5e` (rose-500) — rose signals "computed, alert-worthy" matching derived metrics
- **Semantic:**
  - Success: `#22c55e` (green-500) — synced, healthy, passing
  - Warning: `#eab308` (yellow-500) — drift, elevated risk, approaching threshold
  - Error: `#ef4444` (red-500) — FK violation, critical risk, failed
  - Info: `#3b82f6` (blue-500) — new metrics, informational, neutral status
- **Dark mode:** Default and primary. Dark backgrounds (`#000000` body, `#0f172a` surfaces) with light text.
- **Light mode:** Deferred (see TODOS.md #27). When implemented: invert surfaces (slate-50 bg, white cards), reduce accent saturation 10-20%, keep layer colors unchanged.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — denser than typical SaaS, but not Bloomberg-level packed. Banking users need scanning efficiency without fatigue.
- **Scale:**
  - `2xs`: 2px — hairline gaps, badge internal padding
  - `xs`: 4px — tight element spacing, icon gaps
  - `sm`: 8px — form element padding, compact card padding
  - `md`: 16px — standard section padding, card padding
  - `lg`: 24px — section gaps, generous card padding
  - `xl`: 32px — major section separation
  - `2xl`: 48px — page section breaks
  - `3xl`: 64px — hero padding, major landmarks

## Layout
- **Approach:** Grid-disciplined — strict columns, predictable alignment. Data platforms need scannable layouts where the eye knows where to look.
- **Grid:** 12-column at desktop (>1280px), 6-column tablet (768-1279px), stack on mobile (<768px)
- **Max content width:** 1600px (already in use)
- **Border radius:**
  - `sm`: 4px — badges, small chips
  - `md`: 6px — buttons, form inputs, nav pills
  - `lg`: 8px — cards, panels, dropdowns
  - `xl`: 12px — modal dialogs, large containers
  - `full`: 9999px — avatar circles, dot indicators

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension. No decorative animation. Banking users want speed, not delight.
- **Easing:**
  - Enter: `ease-out` (elements arriving — dropdown appearing, panel opening)
  - Exit: `ease-in` (elements leaving — dropdown closing, toast dismissing)
  - Move: `ease-in-out` (repositioning — sidebar toggle, layout shifts)
- **Duration:**
  - Micro: 50-100ms — hover states, focus rings, color changes
  - Short: 150ms — button interactions, dropdown show/hide, tooltip appear
  - Medium: 250ms — panel transitions, sidebar toggle, page transitions
  - Long: 400ms — reserved for emphasis only (first-time tour highlights)
- **Rules:** Never animate data table rendering. Never add entrance animations to metric values. Never use spring/bounce physics.

## Navigation
- **Persistent top nav:** Compact horizontal bar, sticky, 7 sections with color-coded pills
- **Section colors:**
  - Executive Summary: `#D04A02` (PwC orange)
  - Architecture: `#0d9488` (teal-600)
  - Metrics: `#7c3aed` (violet-600)
  - Data Elements: `#0891b2` (cyan-600)
  - Agents: `#059669` (emerald-600) — agent governance, observatory
  - Ask AI: `#475569` (slate-600)
  - Playbook: `#2563eb` (blue-600)
- **Active state:** `ring-1 ring-white/30` on current section
- **Hidden on:** `/visualizer` (has its own toolbar)
- **Mobile:** Wraps to multiple rows. Visualizer shows "Best on Desktop" message on screens <768px.
- **Accessibility:** Skip-to-content link (sr-only, visible on focus)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-20 | Initial design system created | Created by /design-consultation based on competitive research (Bloomberg, Palantir, dbt Cloud, Looker) and existing codebase analysis |
| 2026-03-20 | Kept Space Mono + Inter (no JetBrains Mono) | User preference — two fonts is cleaner than three, Space Mono already handles data/code contexts |
| 2026-03-20 | Industrial/Utilitarian aesthetic | Matches Bloomberg Terminal heritage, signals "serious financial tooling" to banking professionals |
| 2026-03-20 | L1/L2/L3 color coding as navigation language | Unique differentiator — teal/violet/rose consistently signal which data layer the user is in |
| 2026-03-20 | Restrained color approach | Orange accent on dark is the Bloomberg-established pattern; PwC brand reinforces it |
| 2026-03-20 | Dark mode as default | Every data platform in this category uses dark backgrounds; users expect it |
| 2026-03-24 | Added Agents section (emerald-600) to nav | Agent Library observatory added as 7th nav section — emerald chosen for distinctness from existing teal (Architecture) and cyan (Data Elements) |
