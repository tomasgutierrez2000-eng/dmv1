'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { DemoSideEffects } from '@/components/metric-library/demo/useDemoEngine';

const DSCRLineageView = dynamic(
  () => import('@/components/metric-library/DSCRLineageView').then((m) => m.default),
  { loading: () => <div className="min-h-[60vh] flex items-center justify-center text-pwc-gray-light">Loading lineage…</div>, ssr: false }
);

const DSCRLineageDemo = dynamic(
  () => import('@/components/metric-library/DSCRLineageDemo').then((m) => m.default),
  { ssr: false }
);

/* ────────────────────────────────────────────────────────────────────────────
 * DSCRLineageWithDemo — client wrapper that manages demo lifecycle
 *
 * Holds demoActive state and passes demo-controlled overrides to the
 * DSCRLineageView (expandedLevel, l2Filter) when the demo is running.
 * ──────────────────────────────────────────────────────────────────────────── */

export default function DSCRLineageWithDemo() {
  const [demoActive, setDemoActive] = useState(false);
  const [demoExpandedLevel, setDemoExpandedLevel] = useState<string | null | undefined>(undefined);
  const [demoL2Filter, setDemoL2Filter] = useState<string | undefined>(undefined);

  const handleStartDemo = useCallback(() => {
    setDemoActive(true);
  }, []);

  const handleCloseDemo = useCallback(() => {
    setDemoActive(false);
    setDemoExpandedLevel(undefined);
    setDemoL2Filter(undefined);
  }, []);

  const handleSideEffect = useCallback((fx: Partial<DemoSideEffects>) => {
    if (fx.expandLevel !== undefined) setDemoExpandedLevel(fx.expandLevel);
    if (fx.l2Filter !== undefined) setDemoL2Filter(fx.l2Filter);
  }, []);

  return (
    <>
      <DSCRLineageView
        onStartDemo={handleStartDemo}
        demoExpandedLevel={demoActive ? demoExpandedLevel : undefined}
        demoL2Filter={demoActive ? demoL2Filter : undefined}
      />
      {demoActive && (
        <DSCRLineageDemo
          onClose={handleCloseDemo}
          onSideEffect={handleSideEffect}
        />
      )}
    </>
  );
}
