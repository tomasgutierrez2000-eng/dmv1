'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, P, Lead, DataTable, Divider, InlineCode,
} from '../Primitives'

export default function S10_Glossary() {
  return (
    <Section id="glossary">
      <SectionTitle>Glossary</SectionTitle>

      <Lead>
        Quick reference for terms, abbreviations, and SQL keywords used throughout the platform.
        Come back here whenever you encounter something unfamiliar.
      </Lead>

      {/* ── SQL Terms ────────────────────────────────────────────── */}
      <SubSection id="sql-terms">
        <SubTitle>SQL Terms</SubTitle>

        <DataTable
          headers={['SQL Keyword', 'Plain English', 'Excel Equivalent']}
          rows={[
            [<InlineCode key="1">CREATE TABLE</InlineCode>, 'Make a new spreadsheet with specific columns', 'Creating a new worksheet'],
            [<InlineCode key="2">INSERT INTO</InlineCode>, 'Add new rows of data', 'Pasting new rows'],
            [<InlineCode key="3">SELECT</InlineCode>, 'Read/query data from a table', 'Filtering and viewing rows'],
            [<InlineCode key="4">FROM</InlineCode>, 'Which table to read from', 'Which worksheet to look at'],
            [<InlineCode key="5">WHERE</InlineCode>, 'Filter rows that match a condition', 'Applying a filter'],
            [<InlineCode key="6">JOIN</InlineCode>, 'Combine two tables using a shared column', 'VLOOKUP between sheets'],
            [<InlineCode key="7">GROUP BY</InlineCode>, 'Group rows and apply aggregates (SUM, AVG)', 'Pivot table grouping'],
            [<InlineCode key="8">ORDER BY</InlineCode>, 'Sort the results', 'Sort A→Z or Z→A'],
            [<InlineCode key="9">SUM()</InlineCode>, 'Add up all values in a column', '=SUM(A:A)'],
            [<InlineCode key="10">AVG()</InlineCode>, 'Calculate the average', '=AVERAGE(A:A)'],
            [<InlineCode key="11">COUNT()</InlineCode>, 'Count the number of rows', '=COUNTA(A:A)'],
            [<InlineCode key="12">MAX() / MIN()</InlineCode>, 'Find the highest / lowest value', '=MAX(A:A) / =MIN(A:A)'],
            [<InlineCode key="13">CASE WHEN</InlineCode>, 'If-then-else logic', '=IF(condition, then, else)'],
            [<InlineCode key="14">COALESCE()</InlineCode>, 'Use the first non-empty value', '=IF(ISBLANK(A1), B1, A1)'],
            [<InlineCode key="15">VARCHAR(n)</InlineCode>, 'Text column, max n characters', 'A text cell'],
            [<InlineCode key="16">NUMERIC(p,s)</InlineCode>, 'Number with p total digits, s decimal places', 'A number cell with formatting'],
            [<InlineCode key="17">DATE</InlineCode>, 'A calendar date', 'A date-formatted cell'],
            [<InlineCode key="18">BOOLEAN</InlineCode>, 'True or False', 'A cell with TRUE/FALSE'],
            [<InlineCode key="19">PRIMARY KEY</InlineCode>, 'Unique identifier — no duplicates allowed for this combination', 'Like a unique row ID'],
            [<InlineCode key="20">FOREIGN KEY</InlineCode>, 'A reference to another table\'s primary key', 'Like a VLOOKUP reference column'],
            [<InlineCode key="21">DDL</InlineCode>, 'Data Definition Language — commands that create/alter table structure', 'Designing the worksheet layout'],
            [<InlineCode key="22">DML</InlineCode>, 'Data Manipulation Language — commands that insert/update/delete data', 'Entering and editing data'],
          ]}
        />
      </SubSection>

      {/* ── Domain Abbreviations ─────────────────────────────────── */}
      <SubSection id="domain-abbreviations">
        <SubTitle>Domain Abbreviations</SubTitle>

        <DataTable
          headers={['Code', 'Domain Name', 'What It Covers']}
          rows={[
            ['CQ', 'Credit Quality', 'PD (probability of default), DSCR, LTV, risk ratings, criticized assets'],
            ['EX', 'Exposure', 'Outstanding balances, committed amounts, utilization, undrawn, EAD'],
            ['PR', 'Profitability', 'Revenue, NIM (net interest margin), ROE, ROA, spread, all-in rate'],
            ['LP', 'Loss & Provision', 'Expected loss, LGD, CECL allowance, provision rate'],
            ['CA', 'Capital', 'Risk-weighted assets (RWA), capital allocation, leverage ratios'],
            ['PC', 'Pricing', 'Spread over benchmark, fee rates, pricing exceptions, all-in pricing'],
            ['PO', 'Portfolio Composition', 'Tenor distribution, concentration, collateral mix, maturity profile'],
            ['EW', 'Early Warning', 'Rating migration, PD divergence, utilization trends, amendment activity'],
          ]}
        />
      </SubSection>

      {/* ── Platform Terms ───────────────────────────────────────── */}
      <SubSection id="platform-terms">
        <SubTitle>Platform Terms</SubTitle>

        <DataTable
          headers={['Term', 'Definition']}
          rows={[
            ['Layer (L1, L2, L3)', 'A tier in the data architecture. L1 = reference/master data, L2 = snapshots/events, L3 = derived analytics.'],
            ['Tier (T1–T4)', 'Execution order within L3. Tier 1 tables run first, Tier 4 runs last.'],
            ['Metric', 'A defined business measurement — e.g., "Total Exposure" or "DSCR."'],
            ['Parent Metric', 'The concept of a metric — e.g., "DSCR" as an abstract idea.'],
            ['Variant', 'A specific version of a metric — e.g., "CRE DSCR (NOI)" with a concrete formula.'],
            ['Domain', 'A business area grouping for metrics (CQ, EX, PR, LP, CA, PC, PO, EW).'],
            ['Rollup', 'How a metric aggregates from facility level up to portfolio/LoB level.'],
            ['Dimension', 'The level at which a metric is calculated: facility, counterparty, desk, portfolio, or LoB.'],
            ['Snapshot', 'A point-in-time capture of data — like a photograph of a facility\'s state on a date.'],
            ['Counterparty', 'An entity that borrows money from the bank (a client, borrower, or obligor).'],
            ['Facility', 'A specific credit arrangement — a loan, line of credit, or other credit product.'],
            ['EAD', 'Exposure At Default — the estimated exposure if the borrower defaults.'],
            ['DSCR', 'Debt Service Coverage Ratio — income divided by debt payments. Higher = safer.'],
            ['LTV', 'Loan-to-Value — loan amount divided by collateral value. Lower = safer.'],
            ['PD', 'Probability of Default — the estimated chance a borrower will default. Lower = safer.'],
            ['LGD', 'Loss Given Default — the estimated loss if a borrower defaults. Lower = better.'],
            ['RWA', 'Risk-Weighted Assets — capital required based on the riskiness of assets.'],
            ['LoB', 'Line of Business — a major business division (e.g., Commercial Banking, Investment Banking).'],
            ['NIM', 'Net Interest Margin — the difference between interest earned and interest paid.'],
            ['DDL', 'Data Definition Language — SQL commands that define table structure (CREATE TABLE, etc.).'],
            ['API', 'Application Programming Interface — the bridge between the UI and the database.'],
            ['Orchestrator', 'The master script that runs all SQL in the correct order.'],
            ['Escape Hatch', 'A custom JavaScript calculator used when SQL alone can\'t compute a metric.'],
            ['Seed Data', 'Sample/test data used for development and demonstration.'],
            ['as_of_date', 'The date a snapshot represents — "as of January 31, this was the state."'],
            ['run_version_id', 'A unique identifier for each calculation run, ensuring reproducibility.'],
          ]}
        />
      </SubSection>

      {/* ── End ──────────────────────────────────────────────────── */}
      <div className="mt-16 mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-900/60 border border-slate-700/40 rounded-full px-6 py-3">
          <span className="text-sm text-slate-400">End of Playbook</span>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">v1.0</span>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          This guide is a living document. New sections can be added by creating a component
          in <code className="text-cyan-400/60">components/guide/sections/</code> and registering
          it in the section registry.
        </p>
      </div>
    </Section>
  )
}
