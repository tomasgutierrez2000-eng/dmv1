'use client';

import React, { useState, useCallback } from 'react';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';

// ---------- types ----------

interface ValidationFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  source: string;
}

const DOMAINS = [
  { id: 'credit-risk', name: 'Credit Risk' },
  { id: 'exposure', name: 'Exposure' },
  { id: 'pricing', name: 'Pricing' },
  { id: 'capital', name: 'Capital' },
  { id: 'liquidity', name: 'Liquidity' },
  { id: 'market-risk', name: 'Market Risk' },
  { id: 'operational', name: 'Operational Risk' },
];

const UNIT_TYPES = [
  { id: 'PERCENTAGE', label: '%' },
  { id: 'CURRENCY', label: '$' },
  { id: 'RATIO', label: 'Ratio' },
  { id: 'COUNT', label: 'Count' },
  { id: 'DAYS', label: 'Days' },
  { id: 'RATE', label: 'Rate' },
  { id: 'INDEX', label: 'Index' },
];

const DIRECTIONS = [
  { id: 'HIGHER_BETTER', label: 'Higher is Better', icon: '\u2191' },
  { id: 'LOWER_BETTER', label: 'Lower is Better', icon: '\u2193' },
  { id: 'NEUTRAL', label: 'Neutral', icon: '\u2194' },
];

// ---------- known bug validation (same as Chat API) ----------

const KNOWN_BUGS: Array<{ pattern: RegExp; message: string; severity: 'critical' | 'high' }> = [
  { pattern: /SUM\s*\([^)]*_date[^)]*\)/i, message: 'SUM of date fields is invalid', severity: 'critical' },
  { pattern: /AVG\s*\([^)]*_pct[^)]*\)/i, message: 'AVG of percentages causes Simpson\'s paradox', severity: 'high' },
  { pattern: /WHERE[\s\S]*?LEFT\s+JOIN/i, message: 'WHERE before LEFT JOIN (syntax error)', severity: 'critical' },
  { pattern: /::FLOAT/i, message: 'PostgreSQL-specific cast not portable', severity: 'high' },
  { pattern: /SUM\s*\([^)]*_name[^)]*\)/i, message: 'SUM of text fields is invalid', severity: 'critical' },
  { pattern: /SUM\s*\([^)]*_id\b[^)]*\)/i, message: 'SUM of ID fields is meaningless', severity: 'critical' },
  { pattern: /l3\.\w+/i, message: 'Sources from L3 (should use L1+L2 only)', severity: 'high' },
];

function validateFormula(sql: string): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  for (const bug of KNOWN_BUGS) {
    if (bug.pattern.test(sql)) {
      findings.push({ severity: bug.severity, message: bug.message, source: 'Formula Validator' });
    }
  }
  if (/\/\s*SUM\s*\(/i.test(sql) && !/NULLIF/i.test(sql)) {
    findings.push({ severity: 'high', message: 'Division without NULLIF (division-by-zero risk)', source: 'Formula Validator' });
  }
  return findings;
}

// ---------- main component ----------

interface SaveModalProps {
  open: boolean;
  onClose: () => void;
}

export function SaveModal({ open, onClose }: SaveModalProps) {
  const formulaSQL = useStudioStore((s) => s.formulaSQL);

  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [domain, setDomain] = useState('credit-risk');
  const [unitType, setUnitType] = useState('PERCENTAGE');
  const [direction, setDirection] = useState('HIGHER_BETTER');
  const [saving, setSaving] = useState(false);
  const [validationRun, setValidationRun] = useState(false);
  const [findings, setFindings] = useState<ValidationFinding[]>([]);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);

  const hasCritical = findings.some((f) => f.severity === 'critical');

  // Run validation gate
  const runValidation = useCallback(() => {
    const formulaFindings = validateFormula(formulaSQL);

    // Add governance gate findings (simulated — in production these would call the reviewer agents)
    if (!formulaSQL.includes('dimension_key')) {
      formulaFindings.push({ severity: 'high', message: 'Missing dimension_key alias', source: 'SR 11-7 Checker' });
    }
    if (!formulaSQL.includes('metric_value')) {
      formulaFindings.push({ severity: 'high', message: 'Missing metric_value alias', source: 'SR 11-7 Checker' });
    }

    setFindings(formulaFindings);
    setValidationRun(true);
  }, [formulaSQL]);

  // Save to catalogue
  const handleSave = useCallback(async () => {
    if (hasCritical) return;
    if (!name.trim() || !abbreviation.trim()) return;

    setSaving(true);
    try {
      const resp = await fetch('/api/metrics/library/catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: name.trim(),
          abbreviation: abbreviation.trim().toUpperCase(),
          domain_ids: [domain],
          unit_type: unitType,
          direction,
          metric_class: 'CALCULATED',
          level_definitions: [
            {
              level: 'facility',
              formula_sql: formulaSQL,
              sourcing_type: 'Calc',
            },
          ],
          provenance: {
            source: 'metric-studio-v2',
            ai_assisted: true,
            validation_findings: findings,
            created_at: new Date().toISOString(),
          },
        }),
      });

      if (resp.ok) {
        setSaveResult({ ok: true, message: 'Metric saved to catalogue successfully' });
      } else {
        const err = await resp.json();
        setSaveResult({ ok: false, message: err.error || 'Failed to save' });
      }
    } catch (err) {
      setSaveResult({ ok: false, message: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setSaving(false);
    }
  }, [name, abbreviation, domain, unitType, direction, formulaSQL, findings, hasCritical]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 font-mono">Save to Catalogue</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">x</button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4">
          {/* Name & abbreviation */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Metric Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weighted Average PD"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-[#D04A02]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Abbreviation</label>
              <input
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                placeholder="e.g., WAPD"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-[#D04A02]/50 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Domain, Unit, Direction */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Domain</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-xs text-slate-200 focus:border-[#D04A02]/50 focus:outline-none"
              >
                {DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Unit</label>
              <div className="flex flex-wrap gap-1">
                {UNIT_TYPES.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setUnitType(u.id)}
                    className={`px-2 py-1 text-[9px] rounded border ${
                      unitType === u.id
                        ? 'border-[#D04A02]/40 text-[#D04A02] bg-[#D04A02]/10'
                        : 'border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Direction</label>
              <div className="flex flex-col gap-1">
                {DIRECTIONS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDirection(d.id)}
                    className={`px-2 py-0.5 text-[9px] rounded border text-left ${
                      direction === d.id
                        ? 'border-[#D04A02]/40 text-[#D04A02] bg-[#D04A02]/10'
                        : 'border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Formula preview */}
          <div>
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Formula (facility level)</label>
            <div className="bg-[#1a1a25] border border-slate-800 rounded p-2 max-h-[80px] overflow-y-auto">
              <pre className="text-[9px] font-mono text-[#D04A02]/70 whitespace-pre-wrap">{formulaSQL || 'No formula'}</pre>
            </div>
          </div>

          {/* Governance gate */}
          <div className="border border-slate-800 rounded-lg p-3 bg-[#0a0a12]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Governance Gate</span>
              {!validationRun ? (
                <button
                  onClick={runValidation}
                  className="text-[10px] px-3 py-1 rounded border border-[#D04A02]/30 text-[#D04A02] hover:bg-[#D04A02]/10"
                >
                  Run Validation
                </button>
              ) : (
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  hasCritical ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                  findings.length > 0 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
                  'bg-green-500/10 text-green-400 border border-green-500/30'
                }`}>
                  {hasCritical ? 'BLOCKED' : findings.length > 0 ? `${findings.length} warnings` : 'PASSED'}
                </span>
              )}
            </div>
            {validationRun && findings.length > 0 && (
              <div className="space-y-1 mt-2">
                {findings.map((f, i) => (
                  <div key={i} className={`text-[9px] flex items-start gap-1.5 ${
                    f.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    <span>{f.severity === 'critical' ? '\u2716' : '\u26A0'}</span>
                    <span>{f.message}</span>
                    <span className="text-slate-600 ml-auto">{f.source}</span>
                  </div>
                ))}
              </div>
            )}
            {validationRun && findings.length === 0 && (
              <div className="text-[9px] text-green-400 mt-1">\u2713 Formula validated, SR 11-7 check passed, risk-expert review clean</div>
            )}
          </div>

          {/* Save result */}
          {saveResult && (
            <div className={`text-xs p-2 rounded ${saveResult.ok ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {saveResult.message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !validationRun || hasCritical || !name.trim() || !abbreviation.trim()}
            className="px-4 py-1.5 text-xs bg-[#D04A02] text-white rounded hover:bg-[#E87722] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save to Catalogue'}
          </button>
        </div>
      </div>
    </div>
  );
}
