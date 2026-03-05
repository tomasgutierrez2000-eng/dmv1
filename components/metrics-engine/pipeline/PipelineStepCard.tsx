'use client';

import React from 'react';
import type { PipelineStep } from './dscrPipelineData';
import { PHASE_COLORS } from './dscrPipelineData';

/* ── Simple Python syntax highlighter ── */
function highlightPython(code: string): React.ReactNode[] {
  const lines = code.split('\n');
  return lines.map((line, li) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Process patterns left-to-right
    while (remaining.length > 0) {
      // Comment
      const commentIdx = remaining.indexOf('#');
      if (commentIdx !== -1 && (commentIdx === 0 || remaining[commentIdx - 1] !== "'")) {
        if (commentIdx > 0) {
          parts.push(<span key={key++}>{highlightSegment(remaining.slice(0, commentIdx), key)}</span>);
        }
        parts.push(<span key={key++} className="text-gray-500">{remaining.slice(commentIdx)}</span>);
        remaining = '';
        break;
      }

      // String (single-quoted)
      const strMatch = remaining.match(/^(.*?)('[^']*')/);
      if (strMatch) {
        if (strMatch[1]) parts.push(<span key={key++}>{highlightSegment(strMatch[1], key)}</span>);
        parts.push(<span key={key++} className="text-amber-300">{strMatch[2]}</span>);
        remaining = remaining.slice(strMatch[0].length);
        continue;
      }

      // No more special patterns
      parts.push(<span key={key++}>{highlightSegment(remaining, key)}</span>);
      remaining = '';
    }

    return (
      <div key={li}>
        {parts.length > 0 ? parts : '\u00A0'}
      </div>
    );
  });
}

function highlightSegment(text: string, baseKey: number): React.ReactNode {
  // Highlight Python keywords
  const keywords = /\b(import|from|def|return|if|else|for|in|as|not|and|or|np|pd|True|False|None)\b/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let k = baseKey * 100;

  while ((match = keywords.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={k++} className="text-emerald-300/80">{text.slice(lastIndex, match.index)}</span>);
    }
    parts.push(<span key={k++} className="text-purple-300">{match[0]}</span>);
    lastIndex = keywords.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={k++} className="text-emerald-300/80">{text.slice(lastIndex)}</span>);
  }

  return <>{parts}</>;
}

interface PipelineStepCardProps {
  step: PipelineStep;
  stepIndex: number;
  isActive: boolean;
  onHover: (id: string | null) => void;
}

export default function PipelineStepCard({ step, stepIndex, isActive, onHover }: PipelineStepCardProps) {
  const colors = PHASE_COLORS[step.phase];

  return (
    <div
      data-pipeline={`step-${step.id}`}
      className={`rounded-lg border px-3 py-3 transition-all duration-300 ${colors.bg} ${colors.border} ${
        isActive ? 'ring-1 ring-white/30 scale-[1.01]' : 'hover:ring-1 hover:ring-white/10'
      }`}
      onMouseEnter={() => onHover(step.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Phase badge + title */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors.badge}`}>
          {step.phase}
        </span>
        <span className="text-xs font-semibold text-white">{step.title}</span>
      </div>

      {/* Python code */}
      <div className="bg-black/40 rounded-md px-2.5 py-2 mb-2 font-mono text-[10px] leading-relaxed overflow-x-auto">
        {highlightPython(step.pythonCode)}
      </div>

      {/* Narration */}
      <p className="text-[10px] text-gray-400 leading-relaxed">{step.narration}</p>

      {/* Sample output */}
      {step.sampleOutput && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="border-b border-white/10">
                {step.sampleOutput.headers.map((h) => (
                  <th key={h} className="px-1.5 py-1 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {step.sampleOutput.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-white/5">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-1.5 py-0.5 text-gray-300">{cell}</td>
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
