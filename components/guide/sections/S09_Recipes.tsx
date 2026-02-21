'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, P, Lead, Callout,
  Steps, Step, CodeBlock, AnnotatedCode, Divider, FilePath, InlineCode,
} from '../Primitives'

export default function S09_Recipes() {
  return (
    <Section id="recipes">
      <SectionTitle badge="How-To">Recipes</SectionTitle>

      <Lead>
        These are step-by-step guides for the most common changes you&apos;ll need to make.
        Each recipe tells you exactly which files to touch and what to do.
      </Lead>

      <Callout type="info" title="Before any change">
        Always check <FilePath>sql/l3/09_GLOBAL_CONVENTIONS.md</FilePath> for naming rules and{' '}
        <FilePath>sql/SEED_CONVENTIONS.md</FilePath> for sample data standards before making changes.
      </Callout>

      {/* ── Recipe: Add a New SQL Table ───────────────────────────── */}
      <SubSection id="recipe-add-table">
        <SubTitle>Add a New SQL Table</SubTitle>
        <P>
          Adding a new table to the data model. This example adds an L3 analytics table.
        </P>

        <Steps>
          <Step number={1} title="Decide which layer and tier">
            <P>
              Is this reference data (L1), a snapshot/event (L2), or derived analytics (L3)?
              If L3, which tier? Can it be built from L1 + L2 alone (Tier 1), or does it need
              other L3 tables (Tier 2–4)?
            </P>
          </Step>

          <Step number={2} title="Add the CREATE TABLE statement">
            <P>
              Open the DDL file for your layer. For L3, that&apos;s{' '}
              <FilePath>sql/l3/01_DDL_all_tables.sql</FilePath>. Add your table definition
              following the naming conventions:
            </P>
            <AnnotatedCode
              title="Example: Adding a new table"
              lines={[
                { code: 'CREATE TABLE my_new_summary (', comment: '← use snake_case, descriptive name' },
                { code: '  run_version_id  VARCHAR(64),', comment: '← always include run_version_id for L3' },
                { code: '  as_of_date      DATE,', comment: '← always include as_of_date for L3' },
                { code: '  facility_id     VARCHAR(64),', comment: '← the grain (one row per...)' },
                { code: '  my_value_amt    NUMERIC(20,4),', comment: '← use correct suffix (_amt, _pct, etc.)' },
                { code: '', comment: '' },
                { code: '  PRIMARY KEY (run_version_id,', comment: '← composite primary key' },
                { code: '              as_of_date,', comment: '' },
                { code: '              facility_id)', comment: '' },
                { code: ');', comment: '' },
              ]}
            />
          </Step>

          <Step number={3} title="Add the population query">
            <P>
              Open the appropriate population file for your tier. For Tier 1:{' '}
              <FilePath>sql/l3/02_POPULATION_tier1.sql</FilePath>. Add an{' '}
              <InlineCode>INSERT INTO ... SELECT</InlineCode> statement that fills your table.
            </P>
          </Step>

          <Step number={4} title="Register in the orchestrator">
            <P>
              Open <FilePath>sql/l3/06_ORCHESTRATOR.sql</FilePath> and add your new table
              to the correct tier section. This ensures it runs in the right order.
            </P>
          </Step>

          <Step number={5} title="Update the table manifest">
            <P>
              Open <FilePath>data/l3-tables.ts</FilePath> and add your table to the manifest
              so the platform knows about it. Include the tier, description, and column list.
            </P>
          </Step>

          <Step number={6} title="Add reconciliation (optional)">
            <P>
              If the table has important invariants (e.g., no negative amounts, all facilities
              accounted for), add a check to <FilePath>sql/l3/07_RECONCILIATION.sql</FilePath>.
            </P>
          </Step>
        </Steps>
      </SubSection>

      {/* ── Recipe: Add a Field to a Table ────────────────────────── */}
      <SubSection id="recipe-add-field">
        <SubTitle>Add a Field to an Existing Table</SubTitle>

        <Steps>
          <Step number={1} title="Add the column to the DDL">
            <P>
              Find the table&apos;s <InlineCode>CREATE TABLE</InlineCode> statement in the DDL file.
              Add your new column following naming conventions (e.g.,{' '}
              <InlineCode>new_field_amt NUMERIC(20,4)</InlineCode>).
            </P>
          </Step>

          <Step number={2} title="Update the population query">
            <P>
              Find the table&apos;s population <InlineCode>INSERT INTO ... SELECT</InlineCode> statement.
              Add the new field to both the column list and the SELECT clause. If it&apos;s a
              calculated field, write the formula in the SELECT.
            </P>
          </Step>

          <Step number={3} title="Update downstream consumers">
            <P>
              Check if any other tables SELECT from this table. If they need your new field,
              update their queries too. Use search to find references:{' '}
              <InlineCode>search for the table name in sql/l3/</InlineCode>.
            </P>
          </Step>

          <Step number={4} title="Update the TypeScript definitions (if applicable)">
            <P>
              If this table is used by the UI or API, update the TypeScript type definition
              in <FilePath>data/l3-tables.ts</FilePath> or the relevant type file in{' '}
              <FilePath>types/</FilePath>.
            </P>
          </Step>
        </Steps>

        <Callout type="warning" title="Don't forget seed data">
          If you add a field to L1 or L2, you also need to update the seed data. For L1:{' '}
          <FilePath>scripts/l1/seed-data.ts</FilePath>. For L2: <FilePath>scripts/l2/generate.ts</FilePath>.
        </Callout>
      </SubSection>

      {/* ── Recipe: Add a New Metric ──────────────────────────────── */}
      <SubSection id="recipe-add-metric">
        <SubTitle>Add a New Metric</SubTitle>
        <P>
          Adding a new metric involves two steps: defining it in the library (governance) and
          making it executable (catalog).
        </P>

        <Steps>
          <Step number={1} title="Define the parent metric (if new)">
            <P>
              If this metric concept doesn&apos;t exist yet, add a parent to{' '}
              <FilePath>data/metric-library/parent-metrics.json</FilePath>. Include:
              metric_id, metric_name, definition, metric_class (SOURCED/CALCULATED/HYBRID),
              unit_type, direction, and domain_ids.
            </P>
          </Step>

          <Step number={2} title="Create the variant">
            <P>
              Add a variant to <FilePath>data/metric-library/variants.json</FilePath>. Include:
              variant_id, variant_name, parent_metric_id, formula_display, formula_specification,
              rollup_logic (for each level), status (start as DRAFT), and executable_metric_id.
            </P>
          </Step>

          <Step number={3} title="Add to the L3 catalog">
            <P>
              Add the executable metric definition to <FilePath>data/l3-metrics.ts</FilePath>.
              This is where you specify the actual SQL formula, source fields, allowed dimensions,
              and per-dimension formula overrides.
            </P>
          </Step>

          <Step number={4} title="Test the calculation">
            <P>
              Use the Metrics Deep Dive page (<InlineCode>/metrics/deep-dive</InlineCode>) or run{' '}
              <FilePath>scripts/test-metrics.ts</FilePath> to verify the metric calculates
              correctly at each dimension.
            </P>
          </Step>

          <Step number={5} title="Activate">
            <P>
              Once verified, update the variant status from DRAFT to ACTIVE in the variants JSON.
              Or use the API: <InlineCode>POST /api/metrics/library/variants/[id]/approve</InlineCode>.
            </P>
          </Step>
        </Steps>
      </SubSection>

      {/* ── Recipe: Modify an Existing Metric ─────────────────────── */}
      <SubSection id="recipe-modify-metric">
        <SubTitle>Modify an Existing Metric</SubTitle>

        <Steps>
          <Step number={1} title="Find the metric">
            <P>
              Look up the metric in <FilePath>data/l3-metrics.ts</FilePath> by its ID (e.g., C001).
              Also find its variant in <FilePath>data/metric-library/variants.json</FilePath>.
            </P>
          </Step>

          <Step number={2} title="Update the formula">
            <P>
              In the L3 catalog entry, modify the <InlineCode>formulaSQL</InlineCode> field. If
              the metric has per-dimension overrides, also check{' '}
              <InlineCode>formulasByDimension</InlineCode>.
            </P>
          </Step>

          <Step number={3} title="Update the library variant">
            <P>
              Update the <InlineCode>formula_display</InlineCode> and{' '}
              <InlineCode>formula_specification</InlineCode> in the variant JSON so the
              human-readable description matches the new formula.
            </P>
          </Step>

          <Step number={4} title="Version it">
            <P>
              Bump the variant&apos;s <InlineCode>version</InlineCode> field (e.g., &quot;1.0&quot; → &quot;1.1&quot;)
              and update the <InlineCode>effective_date</InlineCode>. This creates an audit trail.
            </P>
          </Step>

          <Step number={5} title="Test">
            <P>
              Re-run the metric calculation to verify the change produces expected results.
            </P>
          </Step>
        </Steps>
      </SubSection>

      {/* ── Recipe: Understand Execution Order ────────────────────── */}
      <SubSection id="recipe-execution-order">
        <SubTitle>Understand Execution Order</SubTitle>
        <P>
          When the platform processes data, things must happen in a specific sequence.
          Here is the full execution order:
        </P>

        <div className="space-y-2 mb-6">
          {[
            { phase: 'Phase 1', title: 'L1 DDL + Seed', file: 'scripts/l1/output/ddl.sql + seed.sql', desc: 'Create reference tables and fill with master data.' },
            { phase: 'Phase 2', title: 'L2 DDL + Seed', file: 'scripts/l2/output/ddl.sql + seed.sql', desc: 'Create snapshot/event tables and fill with time-series data.' },
            { phase: 'Phase 3', title: 'L3 DDL', file: 'sql/l3/01_DDL_all_tables.sql', desc: 'Create all 49 analytics tables (empty at this point).' },
            { phase: 'Phase 4', title: 'L3 Population', file: 'sql/l3/06_ORCHESTRATOR.sql', desc: 'Fill L3 tables in tier order (Tier 1 → 2 → 3 → 4).' },
            { phase: 'Phase 5', title: 'Reconciliation', file: 'sql/l3/07_RECONCILIATION.sql', desc: 'Validate that all numbers are consistent.' },
            { phase: 'Phase 6', title: 'Metric Values', file: 'scripts/populate-metric-value-fact.ts', desc: 'Pre-calculate metric values for all dimensions (optional).' },
          ].map(p => (
            <div key={p.phase} className="flex gap-3 items-start bg-slate-900/30 border border-slate-700/30 rounded-lg p-3">
              <span className="text-[10px] font-mono text-slate-500 flex-shrink-0 w-16">{p.phase}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{p.title}</p>
                <p className="text-xs text-slate-400">{p.desc}</p>
                <FilePath>{p.file}</FilePath>
              </div>
            </div>
          ))}
        </div>

        <Callout type="warning" title="Never skip phases">
          Each phase depends on the one before it. If you run L3 population without L1 and L2
          data, the tables will be empty. Always run the full sequence, or use the orchestrator
          which handles it automatically.
        </Callout>
      </SubSection>

      <Divider />
    </Section>
  )
}
