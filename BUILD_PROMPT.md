# Build Prompt: Interactive Data Model Visualizer

**Copy everything below and paste into Cursor:**

---

Build a full-stack Next.js application that parses an uploaded Excel file (.xlsx) containing a data model definition and renders an interactive entity-relationship diagram. This should feel like a better, more functional version of dbdiagram.io — fully interactive, explorable, and built for real data modeling work.

## 1. EXCEL FORMAT SPECIFICATION

The Excel file has up to 3 sheets representing data model layers. Sheet names must contain "L1", "L2", or "L3" (case-insensitive match).

**Column Mapping Configuration:**
Use the column mapping from `[EXCEL_TEMPLATE_CONFIG.ts](mdc:EXCEL_TEMPLATE_CONFIG.ts)` which contains all supported column name variations. The parser should use fuzzy matching to find columns by trying all variations in the config arrays.

**L1 Sheet — Core / Raw Tables**
Required columns (use fuzzy matching from config):
- **category**: Grouping/category column
- **tableName**: Physical table name
- **dataElement**: Field/column name
- **description**: Field description
- **whyRequired**: Business justification
- **pkFk**: PK/FK mapping (e.g., "PK", "FK → L1.table.field")

**L2 Sheet — Simplified / Consolidated Tables**
Same as L1, plus:
- **simplificationNote**: Notes about consolidation/simplification

**L3 Sheet — Derived / Calculated Views** (optional)
- **category**: Derived category
- **tableName**: Derived table/view name
- **field**: Derived field name
- **dataType**: SQL data type
- **formula**: Derivation formula
- **sourceTables**: Source table references (e.g., "L2.position, L1.fx_rate")
- **sourceFields**: Source field references
- **derivationLogic**: Plain English derivation logic
- **dashboardUsage**: Dashboard page usage
- **grain**: Record grain definition
- **notes**: Additional notes

## 2. PK/FK PARSING RULES

Parse the PK/FK column value to extract relationships:
- `"PK"` → mark field as primary key
- `"PK (part)"` → composite primary key component
- `"FK → table.field"` → FK pointing to table.field in same layer
- `"FK → L1.table.field"` or `"FK → L2.table.field"` → cross-layer FK
- `"PK & FK → L1.table.field"` → both PK and FK
- Support arrow variants: `→`, `->`, `=>`
- Case-insensitive matching
- Handle extra whitespace gracefully

Build relationships array: `{ id: string, source: {layer, table, field}, target: {layer, table, field}, isCrossLayer: boolean }`

## 3. APPLICATION ARCHITECTURE

Create these files in the existing Next.js structure:

```
app/
├── visualizer/
│   ├── page.tsx              — Main visualizer page
│   └── layout.tsx              — Visualizer-specific layout
components/
├── visualizer/
│   ├── FileUpload.tsx          — Drag-and-drop .xlsx upload zone
│   ├── Canvas.tsx              — Main zoomable/pannable SVG + HTML canvas
│   ├── TableNode.tsx           — Individual table card (draggable, expandable)
│   ├── RelationshipLine.tsx    — SVG bezier curve between connected tables
│   ├── Sidebar.tsx             — Left panel: stats, search, filters, table tree
│   ├── DetailPanel.tsx         — Right panel: selected table or relationship details
│   ├── Toolbar.tsx             — Top bar: zoom controls, layout, export, layer toggles
│   ├── Minimap.tsx             — Bottom-right minimap showing full diagram overview
│   └── Legend.tsx              — Color legend for layers and key types
hooks/
├── useExcelParser.ts           — SheetJS parsing + column mapping logic
├── useDragAndDrop.ts           — Table node dragging
├── useCanvasControls.ts        — Zoom, pan, fit-to-view
├── useAutoLayout.ts            — Force-directed and grid layout algorithms
└── useRelationships.ts         — Relationship line geometry calculations
utils/
├── columnMapper.ts             — Fuzzy column header matching using EXCEL_TEMPLATE_CONFIG
├── pkFkParser.ts               — PK/FK string parsing
├── layoutEngine.ts             — Auto-layout: force-directed, hierarchical, grid
├── exporters.ts                — Export to PNG, SVG, SQL DDL, Mermaid, dbdiagram.io format
└── colors.ts                   — Layer + category color system
types/
└── model.ts                    — TypeScript interfaces for Table, Field, Relationship, Model
```

## 4. CORE FEATURES (Must Have)

**A. File Upload & Parsing**
- Drag-and-drop zone or file picker for .xlsx
- Parse using SheetJS (`xlsx` npm package) - already installed
- Auto-detect sheet names containing L1/L2/L3 (case-insensitive)
- Use `EXCEL_TEMPLATE_COLUMN_MAPPING` from `EXCEL_TEMPLATE_CONFIG.ts` for column matching
- Show parsing summary: X tables, Y fields, Z relationships found
- Handle missing sheets gracefully (L3 is optional)
- Show clear error messages if columns can't be matched, including detected columns

**B. Interactive Canvas**
- Infinite canvas with smooth zoom (mouse wheel) and pan (click-drag empty space)
- Table nodes rendered as cards on the canvas
- Relationship lines rendered as SVG bezier curves between connected table nodes
- Zoom range: 0.1x to 3x with smooth transitions
- Fit-to-view button that auto-zooms to show all visible tables
- Grid background that scales with zoom

**C. Table Nodes**
- Draggable cards (click-drag to reposition)
- Header shows: table name, layer badge (L1/L2/L3), category color dot
- Collapsed state: shows table name + PK field names + field count
- Expanded state: shows all fields with icons (key icon for PK, link icon for FK, plain for regular)
- Each field row shows: name, data type (if available), PK/FK indicator
- Hover on field: tooltip with description, why required, simplification note
- Selected state: golden border highlight
- Double-click: open detail panel for that table

**D. Relationship Lines**
- SVG bezier curves connecting FK fields to their PK targets
- Solid lines for same-layer relationships
- Dashed lines for cross-layer relationships (L1↔L2, L2↔L3, etc.)
- Arrow markers showing direction (FK → PK)
- Hover on line: highlight and show tooltip with source→target info
- Click on line: open relationship detail in right panel
- Lines should connect to the edges of table cards, not overlap content
- Animate lines on hover (subtle glow or thickness change)
- Cardinality indicators where parseable (1:1, 1:N)

**E. Sidebar (Left Panel)**
- Model stats: table count, field count, relationship count, category count, per-layer counts
- Layer toggles: show/hide L1, L2, L3 independently with colored toggle buttons
- Search box: filter tables and fields by name (real-time, highlights matches)
- Category filter dropdown: show only tables in selected category
- Table tree: collapsible list of all tables grouped by category, then by layer. Click table in tree → scroll canvas to that table and select it. Expand table in tree → show field list

**F. Detail Panel (Right Panel, contextual)**
- When a table is selected: show full table details — all fields with descriptions, why required, simplification notes, PK/FK info, data types
- When a relationship is clicked: show source table.field → target table.field, layers, cross-layer indicator
- When an L3 table is selected: also show derivation formula, source tables/fields, dashboard usage, grain
- Close button to dismiss

**G. Toolbar**
- Zoom in / zoom out / reset zoom / fit-to-view buttons
- Auto-layout dropdown: Grid, Force-Directed, Hierarchical (top-down by layer), Circular
- Export dropdown: PNG, SVG, SQL DDL, Mermaid syntax, dbdiagram.io format
- Upload new file button
- Toggle minimap
- Dark mode / light mode toggle

**H. Auto-Layout Algorithms**
- **Grid layout**: Tables arranged in a grid grouped by category, sorted by layer
- **Force-directed**: Simple force simulation — tables repel each other, connected tables attract
- **Hierarchical**: L1 tables at top, L2 in middle, L3 at bottom, grouped by category columns
- **Circular**: Tables arranged in a circle with relationships as chords
- Smooth animated transition when switching layouts
- Remember manual position overrides after auto-layout

**I. Minimap**
- Small overview in bottom-right corner
- Shows all table positions as colored dots
- Shows current viewport as a rectangle
- Click on minimap to jump to that area
- Toggleable

## 5. VISUAL DESIGN

**Color System:**
- L1 layer: Blue tones (#3b82f6 primary, #dbeafe bg, #1e40af text)
- L2 layer: Green tones (#22c55e primary, #dcfce7 bg, #166534 text)
- L3 layer: Purple tones (#a855f7 primary, #f3e8ff bg, #6b21a8 text)
- Categories get assigned from a palette: amber, red, blue, green, purple, pink, teal, orange, indigo, lime, cyan, rose
- PK fields: yellow/gold highlight
- FK fields: blue highlight
- Selected items: amber/gold border (#fbbf24)
- Relationship lines: slate gray default, amber when selected, layer-color when hovered

**Dark Theme (default):**
- Background: gray-950 (#030712)
- Canvas background: gray-900 (#111827) with subtle grid
- Cards: gray-800 (#1e293b) with layer-tinted header
- Text: white/gray-300 primary, gray-500 secondary
- Borders: gray-700

**Light Theme:**
- Background: gray-50
- Canvas: white with light grid
- Cards: white with shadow and layer-tinted header
- Borders: gray-200

**Typography:**
- Table names: font-semibold, 14px
- Field names: font-mono, 12px
- Descriptions: font-normal, 12px, muted color
- Badges: font-bold, 10px, uppercase

## 6. INTERACTIONS & UX DETAILS

- Smooth 200ms transitions on all state changes
- Table nodes have subtle drop shadow that increases when dragged
- Cursor changes: grab on canvas, grabbing when panning, move when dragging table
- Double-click canvas background to fit-to-view
- Keyboard shortcuts: Ctrl+F for search, +/- for zoom, Escape to deselect, Space+drag to pan
- When searching, non-matching tables fade to 20% opacity (don't hide them)
- Clicking empty canvas deselects everything
- Loading state with skeleton shimmer while parsing
- Empty state with clear call-to-action for file upload
- Error state with specific message about what went wrong

## 7. EXPORT FORMATS

**SQL DDL Export:**
```sql
CREATE TABLE facility_master (
  facility_id VARCHAR PRIMARY KEY,
  counterparty_id VARCHAR REFERENCES counterparty(counterparty_id),
  ...
);
```

**Mermaid Export:**
```
erDiagram
  FACILITY_MASTER ||--o{ COUNTERPARTY : has
  FACILITY_MASTER {
    string facility_id PK
    string counterparty_id FK
  }
```

**dbdiagram.io Export:**
```
Table facility_master {
  facility_id varchar [pk]
  counterparty_id varchar [ref: > counterparty.counterparty_id]
}
```

**PNG/SVG:** Render current canvas view to downloadable image.

## 8. TECH STACK

- Next.js 14 (already set up)
- React 18 + TypeScript (already set up)
- Tailwind CSS for styling (already set up)
- SheetJS (`xlsx` package - already installed) for Excel parsing
- `lucide-react` for icons (already installed)
- `html-to-image` or canvas API for PNG/SVG export
- Zustand for state management (install if needed)
- No d3-force needed - implement simple force simulation

## 9. STATE MANAGEMENT

Use Zustand store with these slices:
```typescript
interface ModelStore {
  // Data
  model: DataModel | null;           // parsed tables, fields, relationships
  // View state
  zoom: number;
  pan: { x: number; y: number };
  tablePositions: Record<string, {x: number, y: number}>;
  // Selection
  selectedTable: string | null;
  selectedRelationship: string | null;
  expandedTables: Set<string>;
  // Filters
  searchQuery: string;
  visibleLayers: { L1: boolean; L2: boolean; L3: boolean };
  filterCategory: string;            // 'all' or category name
  // UI
  theme: 'dark' | 'light';
  showMinimap: boolean;
  sidebarOpen: boolean;
  detailPanelOpen: boolean;
  // Layout
  layoutMode: 'grid' | 'force' | 'hierarchical' | 'circular';
}
```

## 10. TYPE DEFINITIONS

```typescript
interface Field {
  name: string;
  description: string;
  whyRequired?: string;
  pkFk?: string;               // raw value from Excel
  isPK: boolean;
  isFK: boolean;
  fkTarget?: { layer: string; table: string; field: string };
  dataType?: string;           // L3 only
  formula?: string;            // L3 only
  sourceTables?: Array<{ layer: string; table: string }>; // L3 only
  sourceFields?: string;        // L3 only
  derivationLogic?: string;     // L3 only
  dashboardUsage?: string;      // L3 only
  grain?: string;               // L3 only
  simplificationNote?: string;  // L2 only
  notes?: string;               // L3 only
}

interface TableDef {
  key: string;                 // "L1.facility_master"
  name: string;                // "facility_master"
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fields: Field[];
}

interface Relationship {
  id: string;
  source: { layer: string; table: string; field: string; tableKey: string };
  target: { layer: string; table: string; field: string; tableKey: string };
  isCrossLayer: boolean;
}

interface DataModel {
  tables: Record<string, TableDef>;
  relationships: Relationship[];
  categories: string[];
  layers: string[];
}
```

## 11. INTEGRATION WITH EXISTING CODE

- Use the existing `app/api/upload-excel/route.ts` as reference for Excel parsing logic
- Import `EXCEL_TEMPLATE_COLUMN_MAPPING` from `EXCEL_TEMPLATE_CONFIG.ts` for column matching
- Use the same error handling patterns as the existing upload API
- Follow the existing Next.js app directory structure
- Use the same styling approach (Tailwind) as existing pages

## 12. CRITICAL IMPLEMENTATION NOTES

1. **Column matching must use EXCEL_TEMPLATE_CONFIG.ts** — import and use `EXCEL_TEMPLATE_COLUMN_MAPPING` for all column lookups
2. **Empty rows in Excel should be skipped** — check that at least tableName and dataElement are non-empty
3. **PK/FK parsing must handle messy data** — extra spaces, inconsistent arrows, missing targets
4. **Table positions must persist** — when filters change and restore, tables should stay where the user dragged them
5. **Relationship lines must recalculate** on table drag — use requestAnimationFrame for smooth updates
6. **Handle large models** (100+ tables) — virtualize off-screen nodes, throttle re-renders
7. **The file upload should work as a re-upload** — user can upload a new file at any time to replace the current model
8. **Category assignment**: if a row has no category, assign "Uncategorized"
9. **Duplicate table handling**: if the same table name appears with different categories, group fields under one table using the first category seen
10. **SheetJS import**: use dynamic import `await import('xlsx')` as done in existing code
11. **Error messages**: Show detected columns when column matching fails, similar to existing upload API

## 13. ROUTING

Create the visualizer at: `/visualizer` route
- Main page: `app/visualizer/page.tsx`
- Should be accessible from the upload page with a "View Visualizer" button
- Should also be accessible from the data model page

---

**This prompt is complete and ready to paste into Cursor. It references your existing config file and integrates with your current Next.js setup.**
