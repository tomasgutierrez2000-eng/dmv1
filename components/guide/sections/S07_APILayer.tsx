'use client'

import {
  Section, SubSection, SectionTitle, SubTitle, P, Lead, Callout,
  DiagramBox, DataTable, Divider, InlineCode, FilePath,
} from '../Primitives'

export default function S07_APILayer() {
  return (
    <Section id="api-layer">
      <SectionTitle>The API Layer</SectionTitle>

      <Lead>
        The API layer is the bridge between the data and the UI. When the dashboard needs to
        show a metric, it asks the API. When the metric library needs to save a new variant,
        it tells the API. Understanding the API helps you trace how data flows from database to screen.
      </Lead>

      {/* ── What Is an API? ──────────────────────────────────────── */}
      <SubSection id="what-is-api">
        <SubTitle>What Is an API?</SubTitle>
        <P>
          An API (Application Programming Interface) is like a restaurant waiter. The kitchen
          (database) has all the food (data). The dining room (UI) has all the customers (users).
          The waiter (API) takes orders from the dining room, brings them to the kitchen, and
          delivers the prepared meal back to the table.
        </P>
        <P>
          Every API has <strong>endpoints</strong> — specific URLs you can call to get or send data.
          Think of each endpoint as a specific item on the menu. You ask for{' '}
          <InlineCode>/api/metrics/values</InlineCode> and you get metric values back.
        </P>

        <DiagramBox title="How APIs Work">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 text-center">
              <div className="text-sm mb-1">🖥️</div>
              <div className="font-semibold text-blue-300">Dashboard UI</div>
              <div className="text-[10px] text-slate-500 mt-1">&quot;Show me DSCR for F001&quot;</div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="text-slate-500">→ request →</div>
              <code className="text-[9px] text-cyan-400 bg-slate-800 px-2 py-0.5 rounded">GET /api/metrics/values?level=facility</code>
              <div className="text-slate-500">← response ←</div>
              <code className="text-[9px] text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">{`{ "DSCR": 1.35 }`}</code>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-3 text-center">
              <div className="text-sm mb-1">⚙️</div>
              <div className="font-semibold text-purple-300">API Server</div>
              <div className="text-[10px] text-slate-500 mt-1">Runs query, returns data</div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="text-slate-500">→ query →</div>
              <div className="text-slate-500">← results ←</div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-center">
              <div className="text-sm mb-1">🗄️</div>
              <div className="font-semibold text-emerald-300">Database</div>
              <div className="text-[10px] text-slate-500 mt-1">L1 / L2 / L3 tables</div>
            </div>
          </div>
        </DiagramBox>

        <Callout type="info" title="HTTP methods">
          APIs use verbs: <InlineCode>GET</InlineCode> means &quot;give me data&quot; (reading).{' '}
          <InlineCode>POST</InlineCode> means &quot;create something new&quot; (writing).{' '}
          <InlineCode>PUT</InlineCode> means &quot;update something existing&quot; (modifying).{' '}
          <InlineCode>DELETE</InlineCode> means &quot;remove something.&quot;
        </Callout>
      </SubSection>

      {/* ── API Reference ────────────────────────────────────────── */}
      <SubSection id="api-reference">
        <SubTitle>API Reference</SubTitle>
        <P>
          Here is every API endpoint in the platform, organized by what it does. Each endpoint
          maps to a file in the <FilePath>app/api/</FilePath> folder.
        </P>

        {/* Metrics APIs */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Metrics</p>
          <DataTable
            headers={['Method', 'Endpoint', 'What It Does', 'File']}
            rows={[
              [
                <span key="m1" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e1">/api/metrics/values</InlineCode>,
                'Get metric values at a given level (facility, counterparty, desk, portfolio, lob)',
                <span key="f1" className="text-[10px]">app/api/metrics/values/</span>,
              ],
              [
                <span key="m2" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e2">/api/metrics/[id]</InlineCode>,
                'Get a single metric\'s full definition',
                <span key="f2" className="text-[10px]">app/api/metrics/[id]/</span>,
              ],
              [
                <span key="m3" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e3">/api/metrics/consumable</InlineCode>,
                'List all executable metrics',
                <span key="f3" className="text-[10px]">app/api/metrics/consumable/</span>,
              ],
              [
                <span key="m4" className="text-blue-400 font-mono">POST</span>,
                <InlineCode key="e4">/api/metrics/deep-dive/run</InlineCode>,
                'Run a metric calculation on demand (e.g., DSCR at facility level)',
                <span key="f4" className="text-[10px]">app/api/metrics/deep-dive/run/</span>,
              ],
            ]}
          />
        </div>

        {/* Metric Library APIs */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Metric Library</p>
          <DataTable
            headers={['Method', 'Endpoint', 'What It Does']}
            rows={[
              [
                <span key="m1" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e1">/api/metrics/library/domains</InlineCode>,
                'List all 8 domains',
              ],
              [
                <span key="m2" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e2">/api/metrics/library/parents</InlineCode>,
                'List all parent metrics (filterable by domain)',
              ],
              [
                <span key="m3" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e3">/api/metrics/library/variants</InlineCode>,
                'List all variants (filterable by parent, status, domain)',
              ],
              [
                <span key="m4" className="text-blue-400 font-mono">POST</span>,
                <InlineCode key="e4">/api/metrics/library/variants</InlineCode>,
                'Create a new metric variant',
              ],
              [
                <span key="m5" className="text-amber-400 font-mono">PUT</span>,
                <InlineCode key="e5">/api/metrics/library/variants/[id]</InlineCode>,
                'Update an existing variant',
              ],
              [
                <span key="m6" className="text-blue-400 font-mono">POST</span>,
                <InlineCode key="e6">/api/metrics/library/import</InlineCode>,
                'Bulk import metrics from Excel',
              ],
              [
                <span key="m7" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e7">/api/metrics/library/export</InlineCode>,
                'Export the entire library as JSON',
              ],
              [
                <span key="m8" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e8">/api/metrics/library/search</InlineCode>,
                'Search metrics by name or keyword',
              ],
            ]}
          />
        </div>

        {/* Schema APIs */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Schema & Data Model</p>
          <DataTable
            headers={['Method', 'Endpoint', 'What It Does']}
            rows={[
              [
                <span key="m1" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e1">/api/schema/bundle</InlineCode>,
                'Full schema export — all layers, metrics, and data dictionary in one response',
              ],
              [
                <span key="m2" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e2">/api/data-dictionary</InlineCode>,
                'Data dictionary — every table, column, and description',
              ],
              [
                <span key="m3" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e3">/api/data-model/tables</InlineCode>,
                'List all tables across all layers',
              ],
              [
                <span key="m4" className="text-blue-400 font-mono">POST</span>,
                <InlineCode key="e4">/api/upload-excel</InlineCode>,
                'Upload and parse an Excel file',
              ],
            ]}
          />
        </div>

        {/* Dashboard APIs */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Dashboard & Other</p>
          <DataTable
            headers={['Method', 'Endpoint', 'What It Does']}
            rows={[
              [
                <span key="m1" className="text-emerald-400 font-mono">GET</span>,
                <InlineCode key="e1">/api/facility-summary</InlineCode>,
                'Get the facility summary data for the dashboard',
              ],
              [
                <span key="m2" className="text-blue-400 font-mono">POST</span>,
                <InlineCode key="e2">/api/agent</InlineCode>,
                'Chat with the AI agent about the data model',
              ],
            ]}
          />
        </div>

        <Callout type="info" title="File location pattern">
          Every API endpoint follows the same pattern: the URL path maps directly to the file path.{' '}
          <InlineCode>/api/metrics/values</InlineCode> → <FilePath>app/api/metrics/values/route.ts</FilePath>.
          This makes it easy to find the code behind any endpoint.
        </Callout>
      </SubSection>

      <Divider />
    </Section>
  )
}
