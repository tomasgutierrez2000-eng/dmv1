'use client';

import { useState, useCallback } from 'react';
import {
  Code2, Sparkles, CheckCircle2, XCircle, Loader2,
  AlertTriangle, Copy, Check,
} from 'lucide-react';

interface FormulaEditorProps {
  currentSql: string;
  level: string;
  itemId: string;
  onAccept: (sql: string) => void;
  onCancel: () => void;
}

/**
 * Dual-mode formula editor: Natural Language (AI) + SQL direct editing.
 */
export default function FormulaEditor({
  currentSql,
  level,
  itemId,
  onAccept,
  onCancel,
}: FormulaEditorProps) {
  const [mode, setMode] = useState<'nl' | 'sql'>('nl');
  const [nlPrompt, setNlPrompt] = useState('');
  const [sqlText, setSqlText] = useState(currentSql);
  const [generatedSql, setGeneratedSql] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string | null;
    warnings: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateSql = useCallback(async () => {
    if (!nlPrompt.trim()) return;
    setGenerating(true);
    setGeneratedSql(null);

    try {
      const res = await fetch('/api/metrics/governance/nl-to-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: nlPrompt.trim(),
          context: { item_id: itemId, level, current_sql: currentSql },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedSql(data.sql ?? null);
    } catch (err) {
      setGeneratedSql(null);
      setValidationResult({
        valid: false,
        error: err instanceof Error ? err.message : 'Failed to generate SQL',
        warnings: [],
      });
    } finally {
      setGenerating(false);
    }
  }, [nlPrompt, itemId, level, currentSql]);

  const handleValidateSql = useCallback(async (sql: string) => {
    setValidating(true);
    setValidationResult(null);

    try {
      const res = await fetch('/api/metrics/governance/validate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      setValidationResult({
        valid: data.valid,
        error: data.error,
        warnings: data.warnings ?? [],
      });
    } catch (err) {
      setValidationResult({
        valid: false,
        error: err instanceof Error ? err.message : 'Validation failed',
        warnings: [],
      });
    } finally {
      setValidating(false);
    }
  }, []);

  const handleCopy = useCallback(() => {
    const sql = mode === 'nl' ? generatedSql : sqlText;
    if (sql) {
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [mode, generatedSql, sqlText]);

  const activeSql = mode === 'nl' ? (generatedSql ?? '') : sqlText;

  return (
    <div className="rounded-lg border border-pwc-gray-light bg-pwc-gray overflow-hidden">
      {/* Mode tabs */}
      <div className="flex items-center border-b border-pwc-gray-light">
        <button
          type="button"
          onClick={() => setMode('nl')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors
            ${mode === 'nl'
              ? 'bg-pwc-orange/10 text-pwc-orange border-b-2 border-pwc-orange'
              : 'text-gray-400 hover:text-gray-300'
            }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Natural Language
        </button>
        <button
          type="button"
          onClick={() => setMode('sql')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors
            ${mode === 'sql'
              ? 'bg-pwc-orange/10 text-pwc-orange border-b-2 border-pwc-orange'
              : 'text-gray-400 hover:text-gray-300'
            }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          SQL
        </button>

        <div className="ml-auto flex items-center gap-2 px-3">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded text-gray-500 hover:text-gray-300 transition-colors"
            title="Copy SQL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* NL Mode */}
      {mode === 'nl' && (
        <div className="p-4 space-y-3">
          <textarea
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            placeholder="Describe what you want the formula to calculate. e.g. &quot;Calculate LTV as committed amount divided by total collateral value, excluding expired collateral&quot;"
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 bg-pwc-black border border-pwc-gray-light rounded-lg
                       text-pwc-white placeholder-gray-500 text-sm resize-none
                       focus:outline-none focus:border-pwc-orange focus:ring-1 focus:ring-pwc-orange/30"
          />

          <button
            type="button"
            onClick={handleGenerateSql}
            disabled={generating || !nlPrompt.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-pwc-orange text-white rounded-lg text-sm font-medium
                       hover:bg-pwc-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating...' : 'Generate SQL'}
          </button>

          {generatedSql && (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Generated SQL</div>
              <pre className="p-3 bg-pwc-black rounded-lg text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 border border-pwc-gray-light/50">
                {generatedSql}
              </pre>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleValidateSql(generatedSql)}
                  disabled={validating}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 bg-pwc-gray-light/30 rounded transition-colors"
                >
                  {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Validate
                </button>
                <button
                  type="button"
                  onClick={() => onAccept(generatedSql)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => { setGeneratedSql(null); setNlPrompt(''); }}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SQL Mode */}
      {mode === 'sql' && (
        <div className="p-4 space-y-3">
          <textarea
            value={sqlText}
            onChange={(e) => setSqlText(e.target.value)}
            rows={12}
            maxLength={10000}
            spellCheck={false}
            className="w-full px-3 py-2 bg-pwc-black border border-pwc-gray-light rounded-lg
                       text-gray-300 font-mono text-xs resize-none
                       focus:outline-none focus:border-pwc-orange focus:ring-1 focus:ring-pwc-orange/30"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleValidateSql(sqlText)}
              disabled={validating || !sqlText.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 bg-pwc-gray-light/30 rounded transition-colors disabled:opacity-50"
            >
              {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Validate Syntax
            </button>
            <button
              type="button"
              onClick={() => setSqlText(currentSql)}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Validation result */}
      {validationResult && (
        <div className={`mx-4 mb-4 px-3 py-2 rounded-lg border text-sm flex items-start gap-2 ${
          validationResult.valid
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {validationResult.valid ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-xs font-medium">
              {validationResult.valid ? 'SQL is valid' : validationResult.error}
            </p>
            {validationResult.warnings.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {validationResult.warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {w}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-pwc-gray-light bg-pwc-black/20">
        <button
          type="button"
          onClick={() => onAccept(activeSql)}
          disabled={!activeSql.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-pwc-orange text-white rounded-lg text-sm font-medium
                     hover:bg-pwc-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Test Changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
