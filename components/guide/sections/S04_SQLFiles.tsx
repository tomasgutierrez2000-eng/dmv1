'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, SubSubTitle, P, Lead, Callout,
  DiagramBox, AnnotatedCode, DataTable, CodeBlock, Divider, FilePath, InlineCode,
} from '../Primitives'

export default function S04_SQLFiles() {
  return (
    <Section id="sql-files">
      <SectionTitle badge="SQL">Understanding the SQL Files</SectionTitle>

      <Lead>
        SQL (Structured Query Language) is the language used to create, fill, and query database
        tables. You don&apos;t need to write SQL from scratch — but understanding what the existing
        SQL files do will let you modify and extend the data model confidently.
      </Lead>

      {/* ── What Is SQL? ─────────────────────────────────────────── */}
      <SubSection id="what-is-sql">
        <SubTitle>What Is SQL?</SubTitle>
        <P>
          Think of a database as a collection of spreadsheets (called &quot;tables&quot;). Each table has
          columns (like Excel column headers) and rows (the actual data). SQL is the language
          you use to:
        </P>
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[
            { cmd: 'CREATE TABLE', plain: 'Make a new spreadsheet', desc: 'Defines the columns, their types, and rules' },
            { cmd: 'INSERT INTO', plain: 'Add rows of data', desc: 'Puts actual data into the table' },
            { cmd: 'SELECT ... FROM', plain: 'Read / query data', desc: 'Pulls data out, optionally filtering and combining' },
            { cmd: 'JOIN', plain: 'Combine two spreadsheets', desc: 'Connects tables using a shared column (like VLOOKUP)' },
          ].map(s => (
            <div key={s.cmd} className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-3">
              <code className="text-xs text-cyan-300 font-mono">{s.cmd}</code>
              <span className="text-xs text-slate-400 ml-2">= {s.plain}</span>
              <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>

        <Callout type="tip" title="The VLOOKUP analogy">
          If you&apos;ve used VLOOKUP in Excel, you already understand JOIN. Both connect two tables
          using a shared key. <InlineCode>JOIN facility_master ON facility_id</InlineCode> is
          exactly like VLOOKUP-ing into the facility master sheet using the facility ID.
        </Callout>
      </SubSection>

      {/* ── The File Map ─────────────────────────────────────────── */}
      <SubSection id="sql-file-map">
        <SubTitle>The File Map</SubTitle>
        <P>
          All SQL files live in predictable locations. Here&apos;s the complete map:
        </P>

        <DiagramBox title="SQL File Map">
          <div className="font-mono text-xs space-y-0.5 text-slate-400">
            <div className="text-slate-200 font-semibold">sql/</div>
            <div className="pl-4">
              <span className="text-slate-500">├── </span>
              <span className="text-amber-300">SEED_CONVENTIONS.md</span>
              <span className="text-slate-600 ml-4">← Rules for sample data</span>
            </div>
            <div className="pl-4">
              <span className="text-slate-500">├── </span>
              <span className="text-blue-300">l1/</span>
              <span className="text-slate-600 ml-4">← L1 reference table SQL</span>
            </div>
            <div className="pl-4">
              <span className="text-slate-500">├── </span>
              <span className="text-emerald-300">l2/</span>
              <span className="text-slate-600 ml-4">← L2 snapshot table SQL</span>
            </div>
            <div className="pl-4">
              <span className="text-slate-500">└── </span>
              <span className="text-purple-300">l3/</span>
              <span className="text-slate-600 ml-4">← L3 analytics SQL (the big one)</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">├── </span>
              <span className="text-slate-300">00_README.md</span>
              <span className="text-slate-600 ml-4">← Overview (start here)</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">├── </span>
              <span className="text-cyan-300">01_DDL_all_tables.sql</span>
              <span className="text-slate-600 ml-4">← Creates all 49 tables</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">├── </span>
              <span className="text-cyan-300">02_POPULATION_tier1.sql</span>
              <span className="text-slate-600 ml-4">← Fills Tier 1 tables</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">├── </span>
              <span className="text-cyan-300">03_POPULATION_tier2.sql</span>
              <span className="text-slate-600 ml-4">← Fills Tier 2 tables</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">├── </span>
              <span className="text-cyan-300">04_POPULATION_tier3.sql</span>
              <span className="text-slate-600 ml-4">← Fills Tier 3 tables</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">├── </span>
              <span className="text-cyan-300">05_POPULATION_tier4.sql</span>
              <span className="text-slate-600 ml-4">← Fills Tier 4 tables</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">├── </span>
              <span className="text-amber-300">06_ORCHESTRATOR.sql</span>
              <span className="text-slate-600 ml-4">← Runs everything in order</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">├── </span>
              <span className="text-amber-300">07_RECONCILIATION.sql</span>
              <span className="text-slate-600 ml-4">← Validates the results</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">├── </span>
              <span className="text-slate-300">08_INDEXES.sql</span>
              <span className="text-slate-600 ml-4">← Speeds up queries</span>
            </div>
            <div className="pl-12">
              <span className="text-slate-500">└── </span>
              <span className="text-slate-300">09_GLOBAL_CONVENTIONS.md</span>
              <span className="text-slate-600 ml-4">← Naming rules</span>
            </div>
          </div>
        </DiagramBox>

        <Callout type="info" title="File numbering">
          Files are numbered (01, 02, 03...) to show the order they should be run.
          Always run them in order. The orchestrator (06) handles this automatically.
        </Callout>
      </SubSection>

      {/* ── DDL Walkthrough ──────────────────────────────────────── */}
      <SubSection id="ddl-walkthrough">
        <SubTitle>DDL: Creating Tables</SubTitle>
        <P>
          DDL stands for <strong>Data Definition Language</strong> — the SQL commands that create
          the structure of tables. Here&apos;s what a real DDL statement looks like, annotated:
        </P>

        <AnnotatedCode
          title="Example: Creating the exposure_metric_cube table"
          lines={[
            { code: 'CREATE TABLE exposure_metric_cube (', comment: '← "Create a new spreadsheet called..."' },
            { code: '  run_version_id     VARCHAR(64),', comment: '← Text column, max 64 chars (which calculation run)' },
            { code: '  as_of_date         DATE,', comment: '← Date column (when was this snapshot?)' },
            { code: '  facility_id        VARCHAR(64),', comment: '← Text column (which facility?)' },
            { code: '  outstanding_amt    NUMERIC(20,4),', comment: '← Number with 4 decimals (dollar amount)' },
            { code: '  utilization_pct    NUMERIC(10,6),', comment: '← Number with 6 decimals (percentage)' },
            { code: '  is_watch_list_flag BOOLEAN,', comment: '← True/false (yes or no)' },
            { code: '', comment: '' },
            { code: '  PRIMARY KEY (run_version_id,', comment: '← These columns together uniquely' },
            { code: '              as_of_date,', comment: '   identify each row (no duplicates' },
            { code: '              facility_id)', comment: '   allowed for this combination)' },
            { code: ');', comment: '' },
          ]}
        />

        <P>
          Breaking it down in plain English: &quot;Create a table called <InlineCode>exposure_metric_cube</InlineCode>.
          Each row represents one facility on one date in one calculation run. It stores dollar
          amounts, percentages, and a yes/no flag for watch list status.&quot;
        </P>
      </SubSection>

      {/* ── Population Walkthrough ───────────────────────────────── */}
      <SubSection id="population-walkthrough">
        <SubTitle>Population: Filling Tables</SubTitle>
        <P>
          Population scripts fill L3 tables by combining data from L1 and L2. They use{' '}
          <InlineCode>INSERT INTO ... SELECT</InlineCode> — which means &quot;take data from these
          other tables and put it into this table.&quot;
        </P>

        <AnnotatedCode
          title="Example: Populating facility_exposure_summary"
          lines={[
            { code: 'INSERT INTO facility_exposure_summary', comment: '← "Put results into this table..."' },
            { code: 'SELECT', comment: '← "by selecting these columns..."' },
            { code: '  fm.facility_id,', comment: '← from the facility_master table' },
            { code: '  fm.facility_name,', comment: '' },
            { code: '  fes.outstanding_amt,', comment: '← from the exposure_snapshot table' },
            { code: '  fes.outstanding_amt / fm.committed_amt', comment: '← calculated: outstanding / committed' },
            { code: '    AS utilization_pct,', comment: '← give the result a name' },
            { code: 'FROM facility_master fm', comment: '← "fm" is a short nickname for the table' },
            { code: 'JOIN facility_exposure_snapshot fes', comment: '← connect (VLOOKUP) using...' },
            { code: '  ON fm.facility_id = fes.facility_id', comment: '← the shared facility_id column' },
            { code: "WHERE fes.as_of_date = '2025-01-31';", comment: '← only for this month\'s snapshot' },
          ]}
        />

        <P>
          In plain English: &quot;Take each facility from the master list. Look up its exposure
          snapshot for January 31. Calculate utilization as outstanding divided by committed.
          Put all of this into the summary table.&quot;
        </P>
      </SubSection>

      {/* ── The Orchestrator ─────────────────────────────────────── */}
      <SubSection id="orchestrator-walkthrough">
        <SubTitle>The Orchestrator</SubTitle>
        <P>
          The orchestrator (<FilePath>sql/l3/06_ORCHESTRATOR.sql</FilePath>) is the master
          script that runs everything in the correct order. It:
        </P>
        <div className="space-y-2 mb-6">
          {[
            'Clears old data from all L3 tables',
            'Runs Tier 1 population (30 tables that read L1 + L2)',
            'Runs Tier 2 population (3 tables that read Tier 1)',
            'Runs Tier 3 population (12 tables that read Tiers 1–2)',
            'Runs Tier 4 population (4 tables that read everything)',
            'Runs reconciliation checks to validate the results',
          ].map((step, i) => (
            <div key={i} className="flex gap-2 items-start text-sm">
              <span className="text-[10px] font-mono text-slate-500 w-4 text-right flex-shrink-0 mt-0.5">{i + 1}.</span>
              <span className="text-slate-300">{step}</span>
            </div>
          ))}
        </div>

        <Callout type="warning" title="Always use the orchestrator">
          Never run population scripts individually unless you know what you&apos;re doing. The
          orchestrator ensures correct order and data consistency.
        </Callout>
      </SubSection>

      {/* ── Naming Conventions ───────────────────────────────────── */}
      <SubSection id="naming-conventions">
        <SubTitle>Naming Conventions</SubTitle>
        <P>
          Every column name follows a strict suffix convention. This makes it possible to
          understand what a column stores just by looking at its name:
        </P>

        <DataTable
          headers={['Suffix', 'Data Type', 'Meaning', 'Example']}
          rows={[
            [<InlineCode key="s1">_id</InlineCode>, 'VARCHAR(64)', 'Business identifier / key', 'facility_id, counterparty_id'],
            [<InlineCode key="s2">_code</InlineCode>, 'VARCHAR(30)', 'Classification code', 'product_code, country_code'],
            [<InlineCode key="s3">_amt</InlineCode>, 'NUMERIC(20,4)', 'Dollar amount (base currency)', 'outstanding_amt, committed_amt'],
            [<InlineCode key="s4">_pct</InlineCode>, 'NUMERIC(10,6)', 'Percentage (25.5% = 25.500000)', 'utilization_pct, lgd_pct'],
            [<InlineCode key="s5">_date</InlineCode>, 'DATE', 'Calendar date', 'as_of_date, maturity_date'],
            [<InlineCode key="s6">_flag</InlineCode>, 'BOOLEAN', 'Yes/no indicator', 'is_watch_list_flag, is_active_flag'],
            [<InlineCode key="s7">_cnt</InlineCode>, 'INTEGER', 'Count of something', 'facility_cnt, breach_cnt'],
            [<InlineCode key="s8">_name</InlineCode>, 'VARCHAR', 'Human-readable name', 'counterparty_name, facility_name'],
          ]}
        />

        <Callout type="tip" title="Reading column names">
          When you see a column like <InlineCode>collateral_coverage_pct</InlineCode>, you instantly
          know: it&apos;s a percentage (because of <InlineCode>_pct</InlineCode>), stored as NUMERIC(10,6),
          and represents collateral coverage. The naming convention is your decoder ring.
        </Callout>
      </SubSection>

      <Divider />
    </Section>
  )
}
