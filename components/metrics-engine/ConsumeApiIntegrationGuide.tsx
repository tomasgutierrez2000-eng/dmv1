'use client';

import React, { useState } from 'react';
import { Copy, Check, BookOpen } from 'lucide-react';

interface SnippetBlockProps {
  title: string;
  code: string;
  language: string;
  id: string;
}

function SnippetBlock({ title, code, language, id }: SnippetBlockProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => setCopied(false));
  };
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden" role="group" aria-labelledby={`${id}-title`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.03]">
        <span id={`${id}-title`} className="text-xs font-medium text-gray-400">{title}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${title} snippet`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono text-gray-300 leading-relaxed max-h-[280px] overflow-y-auto" aria-label={title}>
        <code id={id} className={language}>
          {code}
        </code>
      </pre>
    </div>
  );
}

interface ConsumeApiIntegrationGuideProps {
  /** Base URL for the values API (e.g. origin + /api/metrics/values) */
  valuesApiBaseUrl: string;
  /** Optional: single-metric example (metricId + level) for the snippets */
  singleMetricExample?: { metricId: string; level: string };
  className?: string;
}

export default function ConsumeApiIntegrationGuide({
  valuesApiBaseUrl,
  singleMetricExample = { metricId: 'C101', level: 'facility' },
  className = '',
}: ConsumeApiIntegrationGuideProps) {
  const base = valuesApiBaseUrl || (typeof window !== 'undefined' ? `${window.location.origin}/api/metrics/values` : '/api/metrics/values');
  const singleUrl = `${base}?metricId=${encodeURIComponent(singleMetricExample.metricId)}&level=${singleMetricExample.level}&asOfDate=`;
  const allUrl = `${base}?level=${singleMetricExample.level}&asOfDate=`;

  const fetchAllSnippet = `// All metrics at a dimension (e.g. facility)
const level = 'facility';
const asOfDate = ''; // optional: '2025-01-15'
const url = \`${base}?level=\${level}\${asOfDate ? '&asOfDate=' + asOfDate : ''}\`;

const res = await fetch(url);
if (!res.ok) throw new Error(await res.text());
const data = await res.json();
// data.metrics = [ { metric: { id, name, displayFormat }, rows: [...] }, ... ]
data.metrics?.forEach(({ metric, rows }) => {
  console.log(metric.name, rows?.length ?? 0, 'rows');
});`;

  const fetchSingleSnippet = `// Single metric at a dimension
const metricId = '${singleMetricExample.metricId}';
const level = '${singleMetricExample.level}';
const url = \`${base}?metricId=\${encodeURIComponent(metricId)}&level=\${level}&asOfDate=\`;

const res = await fetch(url);
if (!res.ok) throw new Error(await res.text());
const { metric, rows } = await res.json();
console.log(metric.name, rows);`;

  const htmlSnippet = `<!-- Minimal HTML: load all metrics at facility and show first metric's row count -->
<div id="dashboard-metrics"></div>
<script>
  (async function() {
    const url = '${base}?level=facility&asOfDate=';
    const res = await fetch(url);
    const data = await res.json();
    const first = data.metrics?.[0];
    const el = document.getElementById('dashboard-metrics');
    if (first) {
      el.innerHTML = '<p><strong>' + first.metric.name + '</strong>: ' +
        (first.rows?.length ?? 0) + ' rows</p>';
    } else {
      el.textContent = 'No data';
    }
  })();
</script>`;

  const fetchMultiDimensionSnippet = `// Dashboard with many sections at different dimensions (Facility, Counterparty, LOB, etc.)
// One fetch per dimension — same API, different level param. Run in parallel.
const levels = ['facility', 'counterparty', 'lob'];
const asOfDate = ''; // optional: '2025-01-15'

const results = await Promise.all(
  levels.map(async (level) => {
    const url = \`${base}?level=\${level}\${asOfDate ? '&asOfDate=' + asOfDate : ''}\`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(\`\${level}: \${await res.text()}\`);
    return { level, data: await res.json() };
  })
);

// results[0].data.metrics = all metrics at facility; results[1] = counterparty; results[2] = lob
const byDimension = Object.fromEntries(results.map((r) => [r.level, r.data]));

// Use in your UI: byDimension.facility.metrics, byDimension.counterparty.metrics, byDimension.lob.metrics
console.log('Facility:', byDimension.facility?.metrics?.length ?? 0, 'metrics');
console.log('Counterparty:', byDimension.counterparty?.metrics?.length ?? 0, 'metrics');
console.log('LOB:', byDimension.lob?.metrics?.length ?? 0, 'metrics');`;

  return (
    <div className={className}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90 mb-2 flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5" aria-hidden />
        Dashboard integration guide
      </h4>
      <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
        Use the URL above in your dashboard. No calculations in the client — only fetch and display. For <strong className="text-gray-300">multiple dimensions</strong>, call the API once per dimension (e.g. facility, counterparty, lob) and assign each response to the right section. Optional: add <code className="px-1 rounded bg-white/10">asOfDate=YYYY-MM-DD</code> or filter params.
      </p>
      <div className="space-y-3">
        <SnippetBlock
          id="snippet-fetch-multi"
          title="Dashboard with multiple dimensions (JavaScript)"
          language="javascript"
          code={fetchMultiDimensionSnippet}
        />
        <SnippetBlock
          id="snippet-fetch-all"
          title="Fetch all metrics at one dimension (JavaScript)"
          language="javascript"
          code={fetchAllSnippet}
        />
        <SnippetBlock
          id="snippet-fetch-single"
          title="Fetch single metric (JavaScript)"
          language="javascript"
          code={fetchSingleSnippet}
        />
        <SnippetBlock
          id="snippet-html"
          title="Minimal HTML + script (no build step)"
          language="html"
          code={htmlSnippet}
        />
      </div>
    </div>
  );
}
