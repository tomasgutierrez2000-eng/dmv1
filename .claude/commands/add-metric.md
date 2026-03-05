Add a new metric to the metric library from a spec definition.

Metric name/concept: $ARGUMENTS

## Input Format

The user will provide spec data in tabular format with these columns:
- **Normalized DE Name** → `item_name` + `normalized_de_name`
- **Data Element in DM** → `data_element_in_dm` (the raw field name in the data model)
- **Definition** → `definition` + `spec_definition`
- **Number of Instances** → `number_of_instances`
- **Data Source** → note for reference (may be empty)
- **Insight Provided** → `insight`
- **Data Type** → `data_type`
- **Directly Displayed** → `directly_displayed` (Y/N → true/false)
- **Per-level columns** (Facility, Counterparty, L3 Desk, L2 Portfolio, L1 Department):
  - In Record / Level? → `in_record` (Y/N → true/false)
  - Sourcing Type → `sourcing_type` (Raw, Calc, Agg, Avg)
  - Level Logic → raw spec pseudocode → store in `spec_formula`, then normalize into `level_logic`
  - Dashboard Display Name → `dashboard_display_name` (if blank, generate per convention below)

## Steps

### Phase 1: Read & Understand Context

1. Read `lib/metric-library/types.ts` for the `CatalogueItem`, `LevelDefinition`, `IngredientField`, `DemoFacility`, `DemoPosition` interfaces
2. Read `data/metric-library/catalogue.json` — study the **LTV** entry as the **gold standard** for quality (includes demo data, full level definitions, ingredient fields). Study **INT_INCOME** for spec-alignment fields (`spec_formula`, `spec_definition`, `spec_discrepancy_notes`). Find the next available `item_id`
3. Read `data/l3-metrics.ts` to understand `L3Metric` structure (including `nodes[]`, `edges[]` for lineage DAG) and find the next available metric ID (C0XX)
4. Read `data/metric-library/domains.json` to select appropriate `domain_ids`
5. Read an existing lineage view component (e.g., `components/metric-library/LTVLineageView.tsx` first 100 lines) to understand the visualization pattern
6. Check existing demo step files (e.g., `components/metric-library/ltv-demo/ltvDemoSteps.ts`) for the demo walkthrough pattern

### Phase 2: Determine Metadata Fields

Infer these fields from the spec definition and banking domain knowledge:

| Field | How to determine |
|---|---|
| `item_id` | Use abbreviation or short code (e.g., "UNDRAWN_EXP", "INT_INCOME"). NOT MET-XXX format for spec-sourced metrics |
| `abbreviation` | Short form of metric name |
| `kind` | `DATA_ELEMENT` if it's a raw/sourced value from the data model; `METRIC` if it's a calculated ratio/composite |
| `generic_formula` | Simplified formula expression (e.g., `SUM(unfunded_amount) * Bank_Share`) |
| `unit_type` | `CURRENCY` for $ amounts, `PERCENTAGE` for %, `RATIO` for ratios, `COUNT` for counts, `RATE` for rates, `DAYS` for durations, `ORDINAL` for rankings |
| `direction` | `HIGHER_BETTER` (revenue, income), `LOWER_BETTER` (risk, expense, loss), `NEUTRAL` (exposure, balance) |
| `metric_class` | `SOURCED` = direct field lookup, `CALCULATED` = formula from multiple inputs, `HYBRID` = sourced at one level but calculated at another |
| `domain_ids` | Match from domains.json — common: CR (Credit Risk), CM (Collateral & Mitigation), FP (Financial Performance), EL (Exposure & Limits), PA (Portfolio Analytics) |
| `regulatory_references` | Cite applicable: FR Y-14Q, FR Y-9C, CCAR, Basel III, CECL, FR2590, etc. |

### Phase 3: Extract Ingredient Fields

Parse ALL table.field references from the spec's level_logic columns across all 5 levels. For each unique reference, create an `IngredientField`:

```json
{
  "layer": "L1" or "L2",       // L1 = master/reference tables, L2 = snapshot/aggregate tables
  "table": "table_name",        // snake_case, actual table name from data model
  "field": "field_name",        // snake_case, actual field name
  "description": "...",         // What this field represents in business terms
  "data_type": "DECIMAL(18,2)", // SQL data type
  "sample_value": "50000000.00" // Realistic sample value
}
```

**Table layer rules:**
- `facility_master`, `enterprise_business_taxonomy`, `counterparty_master`, `facility_counterparty_participation` → **L1**
- `facility_exposure_snapshot`, `facility_pricing_snapshot`, `collateral_snapshot`, `positions` → **L2**
- If unsure, reference existing entries for the same table

**Always include structural/join fields** used in the pseudocode even if they aren't the "metric value" fields:
- `facility_id`, `counterparty_id`, `lob_segment_id` — if used for lookups
- `facility_active_flag`, `as_of_date` — if used for filtering
- `managed_segment_id`, `parent_segment_id`, `tree_level` — if hierarchy traversal is used

### Phase 4: Build Level Definitions

For each of the 5 levels (`facility`, `counterparty`, `desk`, `portfolio`, `lob`), create a `LevelDefinition`:

#### 4a. Preserve Raw Spec Pseudocode
Copy the spec's Level Logic text verbatim into `spec_formula`. This is the traceability record.

#### 4b. Normalize `level_logic`
Rewrite the spec pseudocode into the project's standard grammar. Follow INT_INCOME as the template:

**Grammar pattern:**
```
For each DISTINCT([grain_key]) THEN lookup [field] from [Layer].[table] WHERE IS([join_key]) AND IS(MAX([as_of_date])),
THEN [calculation or aggregation expression].
For each [grain_key] [AGG_FUNCTION](ARRAY{[expression]})
```

**Normalization rules:**
- Use `DISTINCT(field)` for the grain key at facility level
- Use `lookup [field] from [Layer.table] WHERE IS([key])` for joins (not "Lookup ... within ... WHEN IS")
- Use `AND IS(MAX([as_of_date]))` for temporal filtering (not "WHEN IS(MAX(AS_OF_DATE))")
- Use `SUM(ARRAY{...})` for aggregations (not "SUM(ARRAY{...} for each ...)")
- For desk/portfolio/lob levels, use the standard hierarchy traversal pattern:
  ```
  For each [L3 LoB], lookup [lob_segment_id] from enterprise_business_taxonomy WHERE [tree_level]='L3' AND [segment_name]=[L3 LoB],
  THEN lookup [facility_id] in facility_master WHERE IS([lob_segment_id]).
  For each [facility_id]: [facility-level calculation].
  For each [L3 LoB] SUM(ARRAY{[result]})
  ```
- For L2 portfolio and L1 lob, add "including all child/descendant segments via parent_segment_id traversal"

#### 4c. Dashboard Display Name Convention
If the spec provides a display name, use it. Otherwise generate as:
- `"[Level] [Metric Name] ([unit])"` — e.g., "Facility Undrawn Exposure ($)", "Desk Undrawn Exposure ($)"
- Level labels: Facility, Counterparty, Desk, Portfolio, Business Segment (NOT "LoB" or "L1")

#### 4d. Source References Per Level
Each level_definition gets its own `source_references[]` listing only the fields actually used in THAT level's logic. Include `description` on each reference.

### Phase 5: Spec Traceability

Populate these fields on the CatalogueItem:

- **`normalized_de_name`** — The "Normalized DE Name" from the spec exactly
- **`data_element_in_dm`** — The "Data Element in DM" from the spec exactly (the raw column name)
- **`spec_definition`** — The original definition from the spec
- **`spec_discrepancy_notes`** — Array of strings documenting ANY differences between spec and implementation:
  - Formula interpretation differences (e.g., "Spec uses X; implementation uses Y because...")
  - Sourcing type corrections (e.g., "Spec labels facility as 'Aggregation'; correct type is 'Calc'")
  - Missing or added levels (e.g., "Spec excludes L3 Desk; kept for reporting per...")
  - Grain differences (e.g., "Spec references position-level; model calculates at facility grain")
  - If no discrepancies, set to `[]`

### Phase 6: Generate Demo Data

Create realistic `demo_data` for the interactive walkthrough. Follow the LTV entry as the template:

#### 6a. Demo Data Structure
```json
{
  "demo_data": {
    "facilities": [ ...DemoFacility[] ]
  }
}
```

#### 6b. Design Principles
- **5 facilities** across **2 counterparties** and **2 desks** (to demonstrate counterparty and desk aggregation)
- Use realistic banking names (e.g., "Sunrise Tower CRE Loan", "Meridian Term Loan A")
- Assign facilities to **2 different L3 desks** within the same L2 portfolio and L1 lob (e.g., SEG-L3-CRE + SEG-L3-CORP → "Commercial Real Estate" → "Commercial Banking")
- Each facility should have **2–3 positions** with varying types (LOAN, COMMITMENT, LINE_OF_CREDIT)
- Use `facility_id` format: `F-X01`, `F-X02`, ... (check existing entries to avoid collision — LTV uses F-001, DSCR uses F-101, UNDRAWN_EXP uses F-201)
- Use `position_id` format: `P-X01`, `P-X02`, ... (same collision avoidance)
- Counterparty IDs: `CP-01`, `CP-02` (can reuse across metrics)

#### 6c. Facility-Level Fields
Every `DemoFacility` must have the base fields:
```json
{
  "facility_id": "F-X01",
  "facility_name": "Descriptive Name",
  "counterparty_id": "CP-01",
  "counterparty_name": "Company Name",
  "lob_segment_id": "SEG-L3-CRE",
  "desk_name": "CRE Lending Desk",
  "portfolio_name": "Commercial Real Estate",
  "lob_name": "Commercial Banking",
  "committed_amt": 50000000,
  "collateral_value": 75000000,
  "ltv_pct": 66.7,
  "positions": [ ...DemoPosition[] ]
}
```

For metric-specific fields not in the base `DemoFacility` interface:
1. Add them as **optional properties** to `DemoFacility` in `lib/metric-library/types.ts` with a JSDoc comment grouping (e.g., `/** Undrawn Exposure fields (optional) */`)
2. Include the computed metric value as a field (e.g., `undrawn_exposure_amt`) so the demo can display and verify it

#### 6d. Position-Level Fields
Each `DemoPosition`:
```json
{
  "position_id": "P-X01",
  "facility_id": "F-X01",
  "position_type": "LOAN" | "COMMITMENT" | "LINE_OF_CREDIT",
  "balance_amount": 35000000,
  "description": "Term Loan Tranche A"
}
```

#### 6e. Numeric Consistency
- Position `balance_amount` values should sum logically with `committed_amt`
- Metric-specific computed values should be verifiable from the raw data (e.g., if LTV = committed/collateral × 100, the `ltv_pct` must match)
- Include at least one edge case (e.g., high-risk facility with unfavorable metric value)
- Vary values across facilities to show meaningful aggregation at counterparty/desk levels

#### 6f. Rollup Verification
The demo data layout must allow verification of ALL 5 rollup levels:
- **Facility**: compute from that facility's data alone
- **Counterparty**: aggregate CP-01's facilities and CP-02's facilities
- **Desk**: aggregate SEG-L3-CRE facilities vs SEG-L3-CORP facilities
- **Portfolio**: all facilities roll up to one portfolio
- **Business Segment**: all facilities roll up to one lob

### Phase 7: Create CatalogueItem in catalogue.json

Add the fully-formed CatalogueItem to `data/metric-library/catalogue.json`. The entry must have:
- [x] All metadata fields from Phase 2
- [x] Complete `ingredient_fields[]` from Phase 3
- [x] All 5 `level_definitions` from Phase 4, each with `spec_formula` and normalized `level_logic`
- [x] Spec traceability fields from Phase 5
- [x] Complete `demo_data` from Phase 6
- [x] `status: "ACTIVE"`

### Phase 8: Create L3Metric (if executable)

If the metric should be calculable in the engine, add an L3Metric entry to `data/l3-metrics.ts`:

#### 8a. Core Fields
- `id`: Next available C0XX
- `name`, `page` (P1-P7), `section`, `metricType`
- `formula`: Human-readable formula
- `formulaSQL`: Executable SQL for in-memory sql.js (facility-level default)
- `description`, `displayFormat` (e.g., `$,.0f` for currency), `sampleValue`
- `sourceFields[]`: Derived from ingredient_fields (L1/L2 only)
- `dimensions`: Array of `{ dimension, interaction }` — which dimensions can filter/group
- `allowedDimensions`: Which calculation grains are supported (facility, counterparty, L3, L2, L1)

#### 8b. Per-Dimension Formulas
Add `formulasByDimension` with SQL for each grain where the logic differs:
```typescript
formulasByDimension: {
  facility:    { formula: '...', formulaSQL: `...` },
  counterparty: { formula: '...', formulaSQL: `...` },
  L3:          { formula: '...', formulaSQL: `...` },
  L2:          { formula: '...', formulaSQL: `...` },
  L1:          { formula: '...', formulaSQL: `...` },
},
```

#### 8c. Display Names Per Dimension
Add `displayNameByDimension` matching the `dashboard_display_name` from each level_definition:
```typescript
displayNameByDimension: {
  facility:    'Facility [Metric] ([unit])',
  counterparty: 'Counterparty [Metric] ([unit])',
  L3:          'Desk [Metric] ([unit])',
  L2:          'Portfolio [Metric] ([unit])',
  L1:          'Business Segment [Metric] ([unit])',
},
```

#### 8d. Lineage Nodes & Edges (for DAG visualization)
Define `nodes[]` and `edges[]` for the lineage DAG. If not provided, the auto-generator in `lib/lineage-generator.ts` creates them from `sourceFields`, but custom nodes give richer visualizations.

**Node structure:**
```typescript
nodes: [
  // L1/L2 source nodes — one per source table (group fields by table)
  { id: 'src-positions', layer: 'L2', table: 'positions', field: 'unfunded_amount',
    fields: ['unfunded_amount', 'position_id'],
    description: 'Position-level unfunded amounts', sampleValue: '15000000' },
  { id: 'src-facility', layer: 'L1', table: 'facility_master', field: 'facility_id',
    fields: ['facility_id', 'bank_share', 'facility_active_flag'],
    description: 'Facility master with bank share', sampleValue: 'F-201' },
  // Transform node — shows the calculation formula
  { id: 'calc', layer: 'transform', table: '', field: 'undrawn_exposure',
    formula: 'SUM(unfunded_amount) * bank_share',
    description: 'Aggregate position unfunded amounts and apply bank share' },
  // L3 output node
  { id: 'output', layer: 'L3', table: 'l3_exposure', field: 'undrawn_exposure',
    description: 'Final undrawn exposure metric', sampleValue: '$15,000,000' },
],
edges: [
  { from: 'src-positions', to: 'calc', label: 'SUM per facility' },
  { from: 'src-facility', to: 'calc', label: 'bank_share multiplier' },
  { from: 'calc', to: 'output' },
],
```

**Design guidelines:**
- Group multiple fields from the same table into one node using `fields[]`
- Add `filterCriteria` on L2/transform nodes to show dimensional context
- The transform node should contain the `formula` text
- Edges should have descriptive `label` values showing the operation

#### 8e. Link to Catalogue
Set `executable_metric_id` on the CatalogueItem to the L3Metric `id` (e.g., `"C001"`).

Skip this phase entirely if the metric is purely documentary (no calculation needed yet).

### Phase 9: Create Lineage Visualization

Create the lineage page and components for the interactive demo walkthrough. This is a multi-file effort — use the `/add-lineage-view` command for the detailed implementation, but here is what needs to be created:

#### 9a. Lineage Page (`app/metrics/[metric]-lineage/page.tsx`)
Minimal server-component wrapper that imports and renders the WithDemo component:
```tsx
import { [Metric]LineageWithDemo } from './[Metric]LineageWithDemo';
export default function Page() { return <[Metric]LineageWithDemo />; }
```

#### 9b. WithDemo Orchestrator (`app/metrics/[metric]-lineage/[Metric]LineageWithDemo.tsx`)
Client component managing demo state (`demoActive`, `demoExpandedLevel`, `demoL2Filter`). Renders the LineageView and conditionally mounts the LineageDemo overlay when active.

#### 9c. Lineage View Component (`components/metric-library/[Metric]LineageView.tsx`)
The main visualization — this is the largest file (30-100KB). Contains:
- **Rollup level definitions** — 5 levels with method (SUM, weighted avg, etc.), formula, description
- **Ingredient field specifications** — layer, table, field, role, sample values
- **Expandable sections** for each rollup level showing the step-by-step calculation
- **TableTraversalDemo** integration for complex multi-table sourcing paths
- Back-link to the metric library

Pattern: Read `components/metric-library/LTVLineageView.tsx` as the template.

#### 9d. Demo Step Definitions (`components/metric-library/[metric]-demo/[metric]DemoSteps.ts`)
Array of step objects for the guided walkthrough:
```typescript
{ id: 'intro', phase: 'overview', phaseLabel: 'Overview',
  title: 'Understanding [Metric]', narration: '...',
  targetSelector: '[data-demo-target="hero"]' },
{ id: 'facility-calc', phase: 'facility', phaseLabel: 'Facility Level',
  title: 'Step 1: Compute per Facility', narration: '...',
  targetSelector: '[data-demo-target="level-facility"]',
  onEnter: { expandLevel: 'facility' } },
// ... one step per rollup level, plus formula animation steps
```

#### 9e. Demo Rollup Data (`components/metric-library/[metric]-demo/[metric]DemoRollupData.ts`)
Sample calculation data for all 5 rollup levels, derived from the `demo_data` in the catalogue:
- Facility-level rows (raw calculation per facility from demo_data)
- Counterparty-level rows (aggregated by CP-01, CP-02)
- Desk-level rows (aggregated by SEG-L3-CRE, SEG-L3-CORP)
- Portfolio and Business Segment totals
- Formatting helpers (`fmtDollar`, `fmtPct`, `fmtM`)

#### 9f. Formula Animation (`components/metric-library/[metric]-demo/[Metric]DemoFormulaAnimation.tsx`)
Animated visualization of the metric calculation:
- Shows numerator/denominator components (for ratios) or summation steps (for aggregates)
- Step-by-step breakdown with sample values from demo_data
- Supports per-level animation (different formula at facility vs counterparty)

#### 9g. Demo Component (`components/metric-library/[Metric]LineageDemo.tsx`)
Orchestrator that ties together DemoSteps, DemoRollupData, and FormulaAnimation. Uses shared utilities from `components/metric-library/demo/`:
- `useDemoEngine.ts` — step tracking, spotlight measurement, scrolling
- `DemoOverlay.tsx` — spotlight overlay rendering
- `DemoControlBar.tsx` — next/previous/close navigation
- `DemoNarrationPanel.tsx` — narration display

**Note:** For a simpler first pass, you can skip Phase 9 and run `/add-lineage-view [metric]` separately afterward. The demo_data from Phase 6 and the nodes/edges from Phase 8d provide the foundation the lineage view needs.

### Phase 10: Quality Validation Checklist

Before finishing, verify:

**Catalogue Entry:**
- [ ] All 5 level_definitions present with correct `sourcing_type` from spec
- [ ] Every `spec_formula` preserves the raw spec text verbatim
- [ ] Every `level_logic` follows the normalized grammar (matches INT_INCOME style)
- [ ] `ingredient_fields` cover ALL table.field references from ALL level_logic entries
- [ ] Each level's `source_references` match the fields actually used in that level's logic
- [ ] `dashboard_display_name` follows convention: "[Level] [Name] ([unit])"
- [ ] `spec_discrepancy_notes` documents any deviations from spec
- [ ] `number_of_instances` matches the count of levels where `in_record=true`
- [ ] Rollup hierarchy is coherent: facility → counterparty → desk → portfolio → lob
- [ ] `item_id`, `abbreviation`, field names use correct casing conventions

**Demo Data:**
- [ ] Demo data has 5 facilities, 2 counterparties, 2 desks
- [ ] Demo data numeric values are internally consistent and verifiable
- [ ] Demo data position/facility IDs don't collide with existing entries
- [ ] Any new fields added to DemoFacility are also added to types.ts with JSDoc grouping
- [ ] At least one edge case facility (e.g., high LTV, low DSCR, large undrawn)
- [ ] Computed metric values on each facility match the formula applied to raw data

**L3Metric:**
- [ ] `executable_metric_id` linked on catalogue entry
- [ ] `formulasByDimension` covers all 5 dimensions with valid SQL
- [ ] `displayNameByDimension` matches catalogue `dashboard_display_name` values
- [ ] `sourceFields` covers all L1/L2 fields from ingredient_fields
- [ ] `nodes[]` and `edges[]` define a coherent lineage DAG (or omitted for auto-generation)

**Lineage Visualization (if created):**
- [ ] Page exists at `app/metrics/[metric]-lineage/page.tsx`
- [ ] WithDemo component manages demo state
- [ ] LineageView has all 5 rollup levels with formulas and descriptions
- [ ] DemoSteps has at least one step per rollup level
- [ ] DemoRollupData uses values from catalogue `demo_data`
- [ ] FormulaAnimation matches the metric's actual formula
- [ ] Back-link to metric library works

**Build Verification:**
- [ ] `catalogue.json` is valid JSON (parse check)
- [ ] `l3-metrics.ts` type-checks with `npx tsc --noEmit`
- [ ] `types.ts` compiles without errors
