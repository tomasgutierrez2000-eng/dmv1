'use client';

import React, { useState, useCallback } from 'react';
import ExceptionRateLineageView from '@/components/metric-library/ExceptionRateLineageView';
import ExceptionRateLineageDemo from '@/components/metric-library/ExceptionRateLineageDemo';
import type { DemoSideEffects } from '@/components/metric-library/demo/useDemoEngine';

/* ────────────────────────────────────────────────────────────────────────────
 * ExceptionRateLineageWithDemo — client wrapper that manages demo lifecycle
 *
 * Holds demoActive state and passes demo-controlled overrides to the
 * ExceptionRateLineageView (expandedLevel) when the demo is running.
 * ──────────────────────────────────────────────────────────────────────────── */

export default function ExceptionRateLineageWithDemo() {
  const [demoActive, setDemoActive] = useState(false);
  const [demoExpandedLevel, setDemoExpandedLevel] = useState<string | null | undefined>(undefined);

  const handleStartDemo = useCallback(() => {
    setDemoActive(true);
  }, []);

  const handleCloseDemo = useCallback(() => {
    setDemoActive(false);
    setDemoExpandedLevel(undefined);
  }, []);

  const handleSideEffect = useCallback((fx: Partial<DemoSideEffects>) => {
    if (fx.expandLevel !== undefined) setDemoExpandedLevel(fx.expandLevel);
  }, []);

  return (
    <>
      <ExceptionRateLineageView
        onStartDemo={handleStartDemo}
        demoExpandedLevel={demoActive ? demoExpandedLevel : undefined}
      />
      {demoActive && (
        <ExceptionRateLineageDemo
          onClose={handleCloseDemo}
          onSideEffect={handleSideEffect}
        />
      )}
    </>
  );
}
