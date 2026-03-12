'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Upload, Download, FileText, ChevronLeft, CheckCircle, AlertTriangle,
  XCircle, ChevronDown, ChevronRight, Wand2, Loader2, Rocket, Send, BookOpen,
  Code, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
  auto_fixable?: boolean;
  auto_fix_value?: string;
}

interface MetricValidation {
  metric_id: string;
  name: string;
  status: 'valid' | 'warning' | 'error';
  issues: ValidationIssue[];
}

interface ValidationReport {
  metrics: MetricValidation[];
  summary: { total: number; valid: number; warnings: number; errors: number };
}

interface DeployStep {
  name: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  duration_ms: number;
}

interface DeployResult {
  steps: DeployStep[];
  overall: 'success' | 'partial' | 'failed';
  deployed_metrics: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function MetricUploadView() {
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [pythonFiles, setPythonFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pythonFileRef = useRef<HTMLInputElement>(null);

  // Validation state
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [metrics, setMetrics] = useState<unknown[] | null>(null);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Deploy state
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  // Demo data auto-populated from live DB during deploy (no user toggle needed)

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPythonFiles([]);
      setValidation(null);
      setMetrics(null);
      setDeployResult(null);
      setChatMessages([]);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f);
      setValidation(null);
      setMetrics(null);
      setDeployResult(null);
      setChatMessages([]);
    }
  }, []);

  const handlePythonChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPythonFiles((prev) => [...prev, ...files.filter(f => f.name.endsWith('.py'))]);
  }, []);

  const handlePythonDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.py'));
    setPythonFiles((prev) => [...prev, ...files]);
  }, []);

  const removePythonFile = useCallback((idx: number) => {
    setPythonFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      for (const pyFile of pythonFiles) {
        formData.append('python_files', pyFile);
      }
      const res = await fetch('/api/metrics/library/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.ok === false) {
        setValidation({ metrics: [], summary: { total: 0, valid: 0, warnings: 0, errors: 1 } });
      } else {
        setValidation(data.validation ?? data.data?.validation);
        setMetrics(data.metrics ?? data.data?.metrics);
      }
    } catch {
      setValidation({ metrics: [], summary: { total: 0, valid: 0, warnings: 0, errors: 1 } });
    } finally {
      setUploading(false);
    }
  }, [file, pythonFiles]);

  const toggleMetric = useCallback((id: string) => {
    setExpandedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleChat = useCallback(async () => {
    if (!chatInput.trim() || !metrics || !validation) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/metrics/library/upload/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          metrics,
          validation,
          history: chatMessages,
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.data?.reply ?? 'No response.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);

      // If AI returned fixed metrics, update state
      const fixed = data.fixed_metrics ?? data.data?.fixed_metrics;
      if (fixed && Array.isArray(fixed)) {
        setMetrics(fixed);
        // Re-validate
        const vRes = await fetch('/api/metrics/library/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics: fixed }),
        });
        const vData = await vRes.json();
        if (vData.validation) setValidation(vData.validation);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Failed to get AI response.' }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, metrics, validation, chatMessages]);

  const handleDeploy = useCallback(async () => {
    if (!metrics) return;
    setDeploying(true);
    try {
      // Read Python files as text
      const pyFilesMap: Record<string, { content: string; filename: string }> = {};
      for (const pyFile of pythonFiles) {
        const content = await pyFile.text();
        pyFilesMap[pyFile.name] = { content, filename: pyFile.name };
      }

      const res = await fetch('/api/metrics/library/upload/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          dry_run: false,
          python_files: pyFilesMap,
        }),
      });
      const data = await res.json();
      setDeployResult(data.data ?? data);
    } catch {
      setDeployResult({ steps: [{ name: 'Deploy', status: 'failed', message: 'Network error', duration_ms: 0 }], overall: 'failed', deployed_metrics: [] });
    } finally {
      setDeploying(false);
    }
  }, [metrics, pythonFiles]);

  // ─── Derived state ─────────────────────────────────────────────────

  const allValid = validation && validation.summary.errors === 0;
  const hasValidation = validation !== null;

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/metrics/library" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ChevronLeft className="w-4 h-4" /> Back to Data Catalogue
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Upload Metrics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Download the template, fill it with your AI&apos;s help, then upload to validate and deploy.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Section 1: Download */}
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Step 1: Download Template & Guide
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            The Excel template includes an Instructions sheet and a Data Dictionary Reference sheet with all available tables and fields.
            Optionally, include Python calculators for auto-generated demo data. Use the guide to help your AI fill out the templates.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/metrics/library/upload/template"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <FileText className="w-4 h-4" /> Download Excel Template (.xlsx)
            </a>
            <a
              href="/api/metrics/library/upload/template/python?mode=full"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
            >
              <Code className="w-4 h-4" /> Download Python Template (Full)
            </a>
            <a
              href="/api/metrics/library/upload/template/python?mode=simple"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 border border-emerald-200"
            >
              <Code className="w-4 h-4" /> Download Python Template (Simple)
            </a>
            <a
              href="/docs/metric-creation-guide.md"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 border"
            >
              <BookOpen className="w-4 h-4" /> View Guide
            </a>
          </div>
        </section>

        {/* Section 2: Upload */}
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Step 2: Upload Filled Template
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Excel drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-gray-400 text-sm">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Drag & drop your .xlsx file here, or click to browse</p>
                </div>
              )}
            </div>

            {/* Python files drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handlePythonDrop}
              onClick={() => pythonFileRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
            >
              <input ref={pythonFileRef} type="file" accept=".py" multiple onChange={handlePythonChange} className="hidden" />
              {pythonFiles.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 mb-2">{pythonFiles.length} Python file{pythonFiles.length !== 1 ? 's' : ''}</p>
                  {pythonFiles.map((pf, idx) => (
                    <div key={idx} className="flex items-center justify-center gap-2 text-gray-700 text-sm">
                      <Code className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium truncate max-w-[180px]">{pf.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePythonFile(idx); }}
                        className="text-gray-400 hover:text-red-500 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">
                  <Code className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Drag & drop .py calculator files here (optional)</p>
                </div>
              )}
            </div>
          </div>

          {file && !hasValidation && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {uploading ? 'Validating...' : 'Validate'}
            </button>
          )}
        </section>

        {/* Section 3: Validation Report */}
        {hasValidation && (
          <section className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {allValid ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
              Step 3: Validation Report
            </h2>

            {/* Summary bar */}
            <div className="flex gap-4 mb-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" /> {validation.summary.total} total
              </span>
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle className="w-3.5 h-3.5" /> {validation.summary.valid} valid
              </span>
              {validation.summary.warnings > 0 && (
                <span className="flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" /> {validation.summary.warnings} warnings
                </span>
              )}
              {validation.summary.errors > 0 && (
                <span className="flex items-center gap-1 text-red-700">
                  <XCircle className="w-3.5 h-3.5" /> {validation.summary.errors} errors
                </span>
              )}
            </div>

            {/* Per-metric accordion */}
            <div className="space-y-2">
              {validation.metrics.map((mv) => (
                <div key={mv.metric_id} className={`border rounded-lg ${
                  mv.status === 'valid' ? 'border-green-200 bg-green-50/50' :
                  mv.status === 'warning' ? 'border-amber-200 bg-amber-50/50' :
                  'border-red-200 bg-red-50/50'
                }`}>
                  <button
                    onClick={() => toggleMetric(mv.metric_id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {mv.status === 'valid' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                       mv.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                       <XCircle className="w-4 h-4 text-red-600" />}
                      <span className="font-mono text-sm font-medium">{mv.metric_id}</span>
                      <span className="text-sm text-gray-600">{mv.name}</span>
                      {mv.issues.length > 0 && (
                        <span className="text-xs text-gray-500">({mv.issues.length} issue{mv.issues.length !== 1 ? 's' : ''})</span>
                      )}
                    </div>
                    {expandedMetrics.has(mv.metric_id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {expandedMetrics.has(mv.metric_id) && mv.issues.length > 0 && (
                    <div className="px-4 pb-3 space-y-2">
                      {mv.issues.map((issue, idx) => (
                        <div key={idx} className={`flex items-start gap-2 text-sm ${
                          issue.field === 'python_calculator' ? 'bg-emerald-50/50 rounded px-2 py-1 -mx-2' : ''
                        }`}>
                          {issue.field === 'python_calculator' ? (
                            <Code className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                          ) : (
                            <span className={`shrink-0 mt-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                              issue.severity === 'error' ? 'bg-red-100 text-red-700' :
                              issue.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {issue.severity}
                            </span>
                          )}
                          <div>
                            <span className={`font-mono text-xs ${
                              issue.field === 'python_calculator' ? 'text-emerald-600' : 'text-gray-500'
                            }`}>{issue.field}:</span>{' '}
                            <span className="text-gray-700">{issue.message}</span>
                            {issue.suggestion && (
                              <span className="text-blue-600 ml-1">{issue.suggestion}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AI Chat toggle */}
            {!allValid && (
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 border border-purple-200"
              >
                <Wand2 className="w-4 h-4" />
                {chatOpen ? 'Hide AI Assistant' : 'Ask AI to Help Fix Issues'}
              </button>
            )}
          </section>
        )}

        {/* Section 4: AI Chat */}
        {chatOpen && (
          <section className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-600" />
              AI Assistant
            </h2>

            <div className="border rounded-lg bg-gray-50 p-4 space-y-3 max-h-96 overflow-y-auto mb-4">
              {chatMessages.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  Ask the AI to help fix validation issues. Try: &quot;Fix all issues&quot; or &quot;What table should I use for interest rates?&quot;
                </p>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg max-w-[80%] ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700'
                  }`}>
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                placeholder="Ask the AI to fix issues or answer questions..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={handleChat}
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* Section 5: Deploy */}
        {hasValidation && allValid && !deployResult && (
          <section className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-green-600" />
              Step 4: Deploy to Data Model
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              All metrics passed validation. Deploy will generate YAML definitions, sync the catalogue, and auto-populate demo data from the live database.
              {pythonFiles.length > 0 && (
                <span className="block mt-1 text-emerald-700">
                  {pythonFiles.length} Python calculator{pythonFiles.length !== 1 ? 's' : ''} will also be deployed.
                </span>
              )}
            </p>

            <button
              onClick={handleDeploy}
              disabled={deploying}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {deploying ? 'Deploying...' : 'Deploy to Data Model'}
            </button>
          </section>
        )}

        {/* Deploy results */}
        {deployResult && (
          <section className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {deployResult.overall === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
               deployResult.overall === 'partial' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> :
               <XCircle className="w-5 h-5 text-red-600" />}
              Deploy Result: {deployResult.overall === 'success' ? 'Success' : deployResult.overall === 'partial' ? 'Partial Success' : 'Failed'}
            </h2>

            <div className="space-y-2">
              {deployResult.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  {step.status === 'success' ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" /> :
                   step.status === 'failed' ? <XCircle className="w-4 h-4 text-red-600 shrink-0" /> :
                   <span className="w-4 h-4 rounded-full bg-gray-300 shrink-0" />}
                  <span className="font-medium text-gray-700">{step.name}</span>
                  <span className="text-gray-500">{step.message}</span>
                  <span className="text-gray-400 text-xs">{step.duration_ms}ms</span>
                </div>
              ))}
            </div>

            {deployResult.overall === 'success' && deployResult.deployed_metrics.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  Successfully deployed {deployResult.deployed_metrics.length} metric{deployResult.deployed_metrics.length !== 1 ? 's' : ''}.{' '}
                  <Link href="/metrics/library" className="underline font-medium">
                    View in catalogue
                  </Link>
                </p>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
