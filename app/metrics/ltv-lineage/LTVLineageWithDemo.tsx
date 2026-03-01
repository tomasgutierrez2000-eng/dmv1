'use client';

import React, { useState, useCallback } from 'react';
import LTVLineageView from '@/components/metric-library/LTVLineageView';
import LTVLineageDemo from '@/components/metric-library/LTVLineageDemo';
import type { DemoSideEffects } from '@/components/metric-library/demo/useDemoEngine';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVLineageWithDemo — client wrapper that manages demo lifecycle
 *
 * Holds demoActive state and passes demo-controlled overrides to the
 * LTVLineageView (expandedLevel, l2Filter) when the demo is running.
 * ──────────────────────────────────────────────────────────────────────────── */

export default function LTVLineageWithDemo() {
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
      <LTVLineageView
        onStartDemo={handleStartDemo}
        demoExpandedLevel={demoActive ? demoExpandedLevel : undefined}
        demoL2Filter={demoActive ? demoL2Filter : undefined}
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
