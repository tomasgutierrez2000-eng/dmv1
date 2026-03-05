Review changes on current branch before merging.

## Steps

1. Run `git diff main...HEAD` to see all changes
2. Run `git log --oneline main..HEAD` to see commit history
3. For each changed file, verify:
   - Type safety: proper TypeScript types used (import from canonical locations)
   - Metric consistency: if L3 metric was added/changed, catalogue item matches
   - Level definitions: all 5 rollup levels defined if applicable
   - sourceFields reference real L1/L2 tables
   - No hardcoded values that should be configurable
   - API responses follow `{ ok, error, data }` pattern
4. Check for potential issues:
   - Missing formulasByDimension for metrics that need per-grain formulas
   - Broken lineage (sourceFields that don't exist)
   - Unused imports or dead code
5. Summarize findings with specific file:line references
