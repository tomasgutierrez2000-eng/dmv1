'use client';

import React, { useState, useCallback } from 'react';
import LTVLineageView from '@/components/metric-library/LTVLineageView';
import LTVLineageDemo from '@/components/metric-library/LTVLineageDemo';
import type { LTVDemoSideEffects } from '@/components/metric-library/ltv-demo/useLTVDemoEngine';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVLineageWithDemo — client wrapper that manages demo lifecycle
 *
 * Holds demoActive state and passes demo-controlled overrides to the
 * LTVLineageView (expandedLevel, activeTable) when the demo is running.
 * ──────────────────────────────────────────────────────────────────────────── */

export default function LTVLineageWithDemo() {
  const [demoActive, setDemoActive] = useState(false);
  const [demoExpandedLevel, setDemoExpandedLevel] = useState<string | null | undefined>(undefined);
  const [demoActiveTable, setDemoActiveTable] = useState<string | null | undefined>(undefined);

  const handleStartDemo = useCallback(() => {
    setDemoActive(true);
  }, []);

  const handleCloseDemo = useCallback(() => {
    setDemoActive(false);
    setDemoExpandedLevel(undefined);
    setDemoActiveTable(undefined);
  }, []);

  const handleSideEffect = useCallback((fx: Partial<LTVDemoSideEffects>) => {
    if (fx.expandLevel !== undefined) setDemoExpandedLevel(fx.expandLevel);
    if (fx.activeTable !== undefined) setDemoActiveTable(fx.activeTable);
  }, []);

  return (
    <>
      <LTVLineageView
        onStartDemo={handleStartDemo}
        demoExpandedLevel={demoActive ? demoExpandedLevel : undefined}
        demoActiveTable={demoActive ? demoActiveTable : undefined}
      />
      {demoActive && (
        <LTVLineageDemo
          onClose={handleCloseDemo}
          onSideEffect={handleSideEffect}
        />
      )}
    </>
  );
}
