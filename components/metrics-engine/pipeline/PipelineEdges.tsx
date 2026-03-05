'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PipelineStep } from './dscrPipelineData';
import { PHASE_SVG_COLORS } from './dscrPipelineData';

/* ═══════════════════════════════════════════════════════════════════════════
 * PipelineEdges — SVG overlay drawing curved edges:
 *   - Table cards (left) → Step cards (middle): horizontal bezier
 *   - Last step card (middle) → Output card (right): horizontal bezier
 *
 * Step-to-step connections are implicit (vertical ordering), no edges drawn.
 * ═══════════════════════════════════════════════════════════════════════════ */

interface EdgeDef {
  fromId: string;
  toId: string;
  color: string;
  stepId: string;
}

interface Rect { x: number; y: number; w: number; h: number }

interface PipelineEdgesProps {
  steps: PipelineStep[];
  tableIds: string[];
  hoveredId: string | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function getRect(containerEl: HTMLElement, selector: string): Rect | null {
  const el = containerEl.querySelector(`[data-pipeline="${selector}"]`);
  if (!el) return null;
  const cRect = containerEl.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  return {
    x: eRect.left - cRect.left,
    y: eRect.top - cRect.top,
    w: eRect.width,
    h: eRect.height,
  };
}

export default function PipelineEdges({ steps, tableIds, hoveredId, containerRef }: PipelineEdgesProps) {
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const rafRef = useRef(0);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const newRects: Record<string, Rect> = {};

    for (const tid of tableIds) {
      const r = getRect(container, `table-${tid}`);
      if (r) newRects[`table-${tid}`] = r;
    }

    for (const step of steps) {
      const r = getRect(container, `step-${step.id}`);
      if (r) newRects[`step-${step.id}`] = r;
    }

    const outR = getRect(container, 'output');
    if (outR) newRects['output'] = outR;

    setRects(newRects);
  }, [steps, tableIds, containerRef]);

  useEffect(() => {
    const timer = setTimeout(measure, 100);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [measure, containerRef]);

  useEffect(() => {
    const timer = setTimeout(measure, 50);
    return () => clearTimeout(timer);
  }, [steps, measure]);

  // Build edges: only table→step and lastStep→output (no step→step)
  const edges: EdgeDef[] = [];

  for (const step of steps) {
    const color = PHASE_SVG_COLORS[step.phase];
    for (const tid of step.inputTableIds) {
      edges.push({
        fromId: `table-${tid}`,
        toId: `step-${step.id}`,
        color,
        stepId: step.id,
      });
    }
  }

  // Last step → output
  if (steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    edges.push({
      fromId: `step-${lastStep.id}`,
      toId: 'output',
      color: '#10b981',
      stepId: lastStep.id,
    });
  }

  const container = containerRef.current;
  if (!container) return null;
  const cRect = container.getBoundingClientRect();

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={cRect.width}
      height={container.scrollHeight}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {edges.map((edge, i) => (
          <marker
            key={`marker-${i}`}
            id={`arrow-${i}`}
            viewBox="0 0 10 7"
            refX="10"
            refY="3.5"
            markerWidth="8"
            markerHeight="6"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={edge.color} opacity={0.6} />
          </marker>
        ))}
      </defs>
      {edges.map((edge, i) => {
        const fromRect = rects[edge.fromId];
        const toRect = rects[edge.toId];
        if (!fromRect || !toRect) return null;

        // Horizontal: right side of source → left side of target
        const x1 = fromRect.x + fromRect.w;
        const y1 = fromRect.y + fromRect.h / 2;
        const x2 = toRect.x;
        const y2 = toRect.y + toRect.h / 2;

        const dx = Math.abs(x2 - x1) * 0.4;
        const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;

        const isHovered = hoveredId === edge.stepId
          || hoveredId === edge.fromId.replace('table-', '')
          || (edge.toId === 'output' && !hoveredId);
        const opacity = hoveredId ? (isHovered ? 0.8 : 0.1) : 0.35;

        return (
          <path
            key={`edge-${i}`}
            d={d}
            fill="none"
            stroke={edge.color}
            strokeWidth={isHovered ? 2 : 1.5}
            opacity={opacity}
            markerEnd={`url(#arrow-${i})`}
            style={{ transition: 'opacity 200ms, stroke-width 200ms' }}
          />
        );
      })}
    </svg>
  );
}
