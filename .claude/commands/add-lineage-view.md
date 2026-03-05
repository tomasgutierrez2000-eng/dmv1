Add a lineage visualization page for a metric.

Metric: $ARGUMENTS

## Steps

1. Find the metric in `data/l3-metrics.ts` and `data/metric-library/catalogue.json`
2. Read an existing lineage page for reference (e.g. `app/metrics/ltv-lineage/page.tsx`)
3. Read the corresponding component in `components/metric-library/` for the pattern
4. Create the lineage page at `app/metrics/[metric]-lineage/page.tsx`
5. Build the lineage component showing:
   - Source fields from L1/L2 tables
   - Transform/calculation node with the formula
   - L3 output metric
   - Demo walkthrough with sample data if `demo_data` exists on the catalogue item
6. Add table traversal demo if the metric has a complex multi-table sourcing path
7. Ensure the lineage view links back to the metric library
