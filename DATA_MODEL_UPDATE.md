# Data Model Update Module

When you change or remove tables (or key fields), the **data model update module** helps you see impacts and keep referential integrity.

## Location

- **Library:** `lib/dataModelUpdate.ts`
- **UI:** In the Visualizer, when you select a table, the right-hand **Details** panel shows an **Impact & dependencies** section (if the table has dependents or dependencies).

## What it does

1. **Dependents** – Tables that reference this table (FK → this table). If you remove or rename this table, those tables will have broken references.
2. **Dependencies** – Tables this table references (this table’s FKs). You must keep those tables (or update the FKs) for this table to stay valid.
3. **Referential integrity** – You can call `validateReferentialIntegrity(model)` to find any relationships whose target table no longer exists (e.g. after a removal).

## Using the module in code

```ts
import {
  getTableImpact,
  getImpactedTables,
  getSuggestedRemovalOrder,
  validateReferentialIntegrity,
} from '@/lib/dataModelUpdate';
import type { DataModel } from '@/types/model';

// Load your model (e.g. from API or store)
const model: DataModel = await fetch('/api/l1-demo-model').then((r) => r.json());

// Single table impact
const impact = getTableImpact(model, 'L1.facility_master');
console.log('Dependents (tables that reference this one):', impact.dependents);
console.log('Dependencies (tables this one references):', impact.dependencies);

// If removing multiple tables: who else is impacted?
const toRemove = ['L1.facility_master', 'L1.credit_agreement_master'];
const impacted = getImpactedTables(model, toRemove);

// Safe order to remove tables (dependents first)
const order = getSuggestedRemovalOrder(model, toRemove);

// After editing the model, check for orphaned FKs
const { valid, orphaned } = validateReferentialIntegrity(model);
if (!valid) {
  console.log('Orphaned references:', orphaned);
}
```

## Workflow for making updates

1. **Change a table or remove it** in your definitions (e.g. L1/L2 definitions or Excel).
2. **Regenerate** sample data and relationships (`npx tsx scripts/l1/generate.ts`, `npx tsx scripts/l2/generate.ts`).
3. **Reload the demo model** in the app and use **Impact & dependencies** in the Details panel to confirm dependents/dependencies.
4. **If you removed a table:** run `getImpactedTables(model, [removedTableKey])` to list tables that need their relationships (or sample data) updated; then run `getSuggestedRemovalOrder` if you are removing several tables in a batch.
5. **Optionally** run `validateReferentialIntegrity(model)` after changes to ensure no FK points to a missing table.

This keeps the overall data model consistent when you add, remove, or rename tables and keys.
