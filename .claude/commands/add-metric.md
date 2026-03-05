Add a new metric to the metric library.

Metric name/concept: $ARGUMENTS

## Steps

1. Read `data/metric-library/catalogue.json` to understand existing patterns and find the next available `item_id`
2. Read `lib/metric-library/types.ts` for the `CatalogueItem` interface
3. Read `data/l3-metrics.ts` to understand `L3Metric` structure and find the next available metric ID
4. Create the CatalogueItem in `catalogue.json` with:
   - Proper `item_id` (MET-XXX format)
   - All 5 `level_definitions` (facility → counterparty → desk → portfolio → lob)
   - `ingredient_fields` referencing actual L1/L2 tables from the data model
   - `generic_formula` and `definition`
   - Correct `unit_type`, `direction`, `metric_class`
5. Add L3Metric entry in `data/l3-metrics.ts` with `formulaSQL`, `sourceFields`, `dimensions`
6. Link via `executable_metric_id` on the catalogue item
7. If the metric needs a lineage visualization, create a page at `app/metrics/[metric]-lineage/`
8. Verify the metric follows the rollup hierarchy: Facility → Counterparty → Desk → Portfolio → Business Segment
