'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';
import { SqlDebugger } from './SqlDebugger';

// ---------- types ----------

type Tab = 'chat' | 'fields' | 'sql';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: ChatAction[];
  timestamp: number;
}

interface ChatAction {
  type: 'explanation' | 'formula' | 'suggestion' | 'validation' | 'canvas_update' | 'error';
  text?: string;
  sql?: string;
  tables?: string[];
  explanation?: string;
  confidence?: string;
  validationWarnings?: string[];
  issues?: string[];
  severity?: string;
  chips?: string[];
}

// ---------- main component ----------

export function ChatPanel() {
  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Store state
  const nodes = useStudioStore((s) => s.nodes);
  const edges = useStudioStore((s) => s.edges);
  const formulaSQL = useStudioStore((s) => s.formulaSQL);
  const executionResult = useStudioStore((s) => s.executionResult);
  const isExecuting = useStudioStore((s) => s.isExecuting);
  const executeFormula = useStudioStore((s) => s.executeFormula);
  const executionMode = useStudioStore((s) => s.executionMode);
  const setExecutionMode = useStudioStore((s) => s.setExecutionMode);
  const selectedNodeId = useStudioStore((s) => s.selectedNodeId);

  const setFormulaSQL = useStudioStore((s) => s.setFormulaSQL);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pick up initial message from onboarding overlay (sessionStorage handoff)
  useEffect(() => {
    const initialMessage = sessionStorage.getItem('studio-initial-message');
    if (initialMessage) {
      sessionStorage.removeItem('studio-initial-message');
      // Small delay to let components mount fully
      const timer = setTimeout(() => sendMessage(initialMessage), 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Generate context-aware suggestion chips
  const getSuggestionChips = useCallback((): string[] => {
    if (nodes.length === 0 && !formulaSQL) {
      return ['Expected Loss Rate', 'Weighted Average PD', 'Loan-to-Value', 'Utilization Rate'];
    }
    if (executionResult && 'ok' in executionResult && executionResult.ok) {
      return ['Why is this value high?', 'Run all levels', 'Group by segment', 'Save to catalogue'];
    }
    if (formulaSQL) {
      return ['Run this formula', 'Add a filter', 'Group by segment', 'Explain this formula'];
    }
    return ['What do you want to measure?', 'Explain Expected Loss', 'Build a PD metric'];
  }, [nodes.length, formulaSQL, executionResult]);

  // Send message to chat API
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const context = {
        nodes: nodes.map((n) => ({
          tableName: (n.data as Record<string, unknown>).tableName as string,
          layer: (n.data as Record<string, unknown>).layer as string,
          selectedFields: (n.data as Record<string, unknown>).selectedFields as string[],
        })),
        edges: edges.map((e) => ({ source: e.source, target: e.target })),
        formulaSQL: formulaSQL || undefined,
        executionResult: executionResult && 'ok' in executionResult && executionResult.ok
          ? { rows: (executionResult as { rows: unknown[] }).rows?.slice(0, 5), rowCount: (executionResult as { rowCount: number }).rowCount }
          : undefined,
      };

      const history = messages.slice(-6).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.role === 'assistant' && m.actions
          ? m.actions.filter((a) => a.type === 'explanation').map((a) => a.text || '').join('\n')
          : m.content,
      }));

      const resp = await fetch('/api/metrics/studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), context, history }),
      });

      const data = await resp.json();

      if (!data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            role: 'system',
            content: data.error || 'Something went wrong',
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: '',
        actions: data.actions,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'system',
          content: `Error: ${err instanceof Error ? err.message : 'Failed to connect'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [nodes, edges, formulaSQL, executionResult, messages, isLoading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputValue);
      }
    },
    [inputValue, sendMessage]
  );

  const handleChipClick = useCallback(
    (chip: string) => {
      if (chip === 'Run this formula') {
        executeFormula();
      } else if (chip === '__apply_formula__') {
        // Find the most recent formula action and apply it to the canvas
        const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
        const formulaAction = lastAssistantMsg?.actions?.find((a) => a.type === 'formula' && a.sql);
        if (formulaAction?.sql) {
          setFormulaSQL(formulaAction.sql);
        }
      } else {
        sendMessage(chip);
      }
    },
    [sendMessage, executeFormula, setFormulaSQL, messages]
  );

  return (
    <div className="w-[300px] min-w-[280px] bg-[#0f1017] border-l border-slate-800 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 shrink-0">
        {(['chat', 'fields', 'sql'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-[11px] capitalize border-b-2 transition-colors ${
              tab === t
                ? 'text-[#D04A02] border-[#D04A02]'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="flex-1" />
        {/* Execute button */}
        <button
          onClick={executeFormula}
          disabled={isExecuting || !formulaSQL}
          className="px-3 py-1 text-[10px] text-[#D04A02] hover:bg-[#D04A02]/10 disabled:opacity-30 rounded-sm mr-1 my-1 border border-[#D04A02]/30"
        >
          {isExecuting ? 'Running...' : '\u25B6 Run'}
        </button>
      </div>

      {/* Execution mode toggle */}
      <div className="px-3 py-1.5 flex items-center gap-2 border-b border-slate-800/50 text-[9px] shrink-0">
        <span className="text-slate-500">Mode:</span>
        {(['sqljs', 'postgresql'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setExecutionMode(mode)}
            className={`px-2 py-0.5 rounded border text-[9px] ${
              executionMode === mode
                ? 'border-[#D04A02]/50 text-[#D04A02] bg-[#D04A02]/10'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
          >
            {mode === 'sqljs' ? 'Demo' : 'PG'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'chat' && (
          <ChatTab
            messages={messages}
            isLoading={isLoading}
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSend={sendMessage}
            onKeyDown={handleKeyDown}
            onChipClick={handleChipClick}
            chips={getSuggestionChips()}
            messagesEndRef={messagesEndRef}
            inputRef={inputRef}
          />
        )}
        {tab === 'fields' && (
          <FieldsTab selectedNode={selectedNode} executionResult={executionResult} />
        )}
        {tab === 'sql' && (
          <SqlTab formulaSQL={formulaSQL} />
        )}
      </div>
    </div>
  );
}

// ---------- chat tab ----------

function ChatTab({
  messages,
  isLoading,
  inputValue,
  setInputValue,
  onSend,
  onKeyDown,
  onChipClick,
  chips,
  messagesEndRef,
  inputRef,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSend: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onChipClick: (chip: string) => void;
  chips: string[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-slate-500 text-xs mb-3">Ask the AI to build a metric formula</div>
            <div className="text-slate-600 text-[10px] italic">
              Try: &ldquo;average PD weighted by exposure&rdquo;
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onChipClick={onChipClick} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="animate-pulse">Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      {chips.length > 0 && messages.length === 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-slate-800/50 shrink-0">
          {chips.map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick(chip)}
              className="text-[9px] px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-[#D04A02] hover:border-[#D04A02]/40 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 border-t border-slate-800 shrink-0">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything about your data..."
            rows={2}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-[#D04A02]/50 focus:ring-1 focus:ring-[#D04A02]/20"
          />
          <button
            onClick={() => onSend(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 bottom-2 text-[10px] text-[#D04A02] hover:bg-[#D04A02]/10 disabled:opacity-30 px-2 py-0.5 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}

// ---------- message bubble ----------

function MessageBubble({ message, onChipClick }: { message: ChatMessage; onChipClick: (chip: string) => void }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-[#D04A02]/10 border border-[#D04A02]/20 rounded-lg px-3 py-2 max-w-[90%]">
          <p className="text-xs text-slate-200">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.role === 'system') {
    return (
      <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/20 rounded px-2.5 py-1.5">
        {message.content}
      </div>
    );
  }

  // Assistant message — render actions
  return (
    <div className="space-y-2">
      {message.actions?.map((action, i) => (
        <ActionRenderer key={i} action={action} onChipClick={onChipClick} />
      ))}
      {!message.actions && message.content && (
        <div className="text-xs text-slate-300 leading-relaxed">{message.content}</div>
      )}
    </div>
  );
}

// ---------- action renderers ----------

function ActionRenderer({ action, onChipClick }: { action: ChatAction; onChipClick: (chip: string) => void }) {
  switch (action.type) {
    case 'explanation':
      return (
        <div className="text-xs text-slate-300 leading-relaxed">
          {action.text}
        </div>
      );

    case 'formula': {
      const fa = action;
      return (
        <div className="space-y-1.5">
          {fa.explanation && (
            <p className="text-[10px] text-slate-400">{fa.explanation}</p>
          )}
          <div className="bg-[#1a1a25] border border-slate-800 rounded p-2 relative">
            {/* Confidence badge */}
            <div className="absolute top-1.5 right-1.5">
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${
                fa.confidence === 'high' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                fa.confidence === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                'text-red-400 border-red-500/30 bg-red-500/10'
              }`}>
                {fa.confidence}
              </span>
            </div>
            <pre className="text-[10px] font-mono text-[#D04A02] whitespace-pre-wrap leading-relaxed pr-14">
              {fa.sql}
            </pre>
          </div>
          {(fa.tables?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {(fa.tables ?? []).map((t) => (
                <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-mono">
                  {t}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={() => onChipClick('__apply_formula__')}
              className="text-[10px] px-2.5 py-1 rounded bg-[#D04A02]/10 text-[#D04A02] border border-[#D04A02]/30 hover:bg-[#D04A02]/20 transition-colors"
            >
              Apply to Canvas
            </button>
            <button
              onClick={() => onChipClick('Explain this formula step by step')}
              className="text-[10px] px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200 transition-colors"
            >
              Explain
            </button>
          </div>
        </div>
      );
    }

    case 'validation': {
      const va = action;
      return (
        <div className={`text-[10px] rounded px-2.5 py-1.5 space-y-0.5 ${
          va.severity === 'error'
            ? 'bg-red-950/20 border border-red-500/20 text-red-400'
            : 'bg-yellow-950/20 border border-yellow-500/20 text-yellow-400'
        }`}>
          {(va.issues ?? []).map((issue, i) => (
            <div key={i}>&#x26A0; {issue}</div>
          ))}
        </div>
      );
    }

    case 'suggestion': {
      const sa = action;
      return (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {(sa.chips ?? []).map((chip) => (
            <button
              key={chip}
              onClick={() => onChipClick(chip)}
              className="text-[9px] px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-[#D04A02] hover:border-[#D04A02]/40 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}

// ---------- fields tab (from DataInspector) ----------

function FieldsTab({
  selectedNode,
  executionResult,
}: {
  selectedNode: { data: Record<string, unknown> } | undefined;
  executionResult: unknown;
}) {
  const nodeData = selectedNode?.data;

  if (nodeData?.type === 'table') {
    const td = nodeData as { tableName: string; layer: string; selectedFields: string[]; rowCount?: number };
    return (
      <div className="p-3 overflow-y-auto flex-1">
        <div className="mb-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Selected Table</div>
          <div className="text-sm text-slate-200 font-medium mt-0.5 font-mono">{td.tableName}</div>
          <div className="text-[10px] text-violet-400 mt-0.5">
            {td.layer.toUpperCase()} &middot; {td.selectedFields?.length ?? 0} fields
          </div>
        </div>
        <div className="space-y-0.5">
          {td.selectedFields?.map((f) => (
            <div key={f} className="text-[10px] text-slate-400 font-mono py-0.5 px-1 hover:bg-slate-800/50 rounded">
              {f}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (executionResult && typeof executionResult === 'object' && 'ok' in (executionResult as Record<string, unknown>)) {
    const er = executionResult as { ok: boolean; rows?: Record<string, unknown>[]; rowCount?: number; error?: string };
    if (!er.ok) {
      return (
        <div className="p-3">
          <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 rounded p-2">
            {er.error}
          </div>
        </div>
      );
    }
    return (
      <div className="p-3 overflow-y-auto flex-1">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
          Results &middot; {er.rowCount} rows
        </div>
        {er.rows && er.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px] font-mono">
              <thead>
                <tr>
                  {Object.keys(er.rows[0]).map((col) => (
                    <th key={col} className="text-left px-1.5 py-1 text-slate-500 border-b border-slate-800 font-medium">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {er.rows.slice(0, 30).map((row, i) => (
                  <tr key={i} className="hover:bg-[#1a1a25]">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-1.5 py-0.5 text-slate-400 border-b border-slate-800/30 truncate max-w-[80px]">
                        {v === null || v === undefined ? '\u2014' : typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 text-xs text-slate-500 italic">
      Select a table node to see its fields, or run the formula to see results.
    </div>
  );
}

// ---------- sql tab ----------

function SqlTab({ formulaSQL }: { formulaSQL: string }) {
  return (
    <div className="p-3 overflow-y-auto flex-1">
      {formulaSQL ? (
        <>
          <div className="bg-[#1a1a25] border border-slate-800 rounded p-2 mb-3 max-h-[200px] overflow-y-auto">
            <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
              {formulaSQL}
            </pre>
          </div>
          <SqlDebugger />
        </>
      ) : (
        <div className="text-xs text-slate-500 italic">No formula composed yet.</div>
      )}
    </div>
  );
}
