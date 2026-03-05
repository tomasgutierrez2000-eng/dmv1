'use client';

import React, { useState, useCallback } from 'react';
import AllocPctLineageView from '@/components/metric-library/AllocPctLineageView';
import AllocPctLineageDemo from '@/components/metric-library/AllocPctLineageDemo';
import type { DemoSideEffects } from '@/components/metric-library/demo/useDemoEngine';

/* ────────────────────────────────────────────────────────────────────────────
 * AllocPctLineageWithDemo — client wrapper that manages demo lifecycle
 *
 * Holds demoActive state and passes demo-controlled overrides to the
 * AllocPctLineageView (expandedLevel) when the demo is running.
 * ──────────────────────────────────────────────────────────────────────────── */

export default function AllocPctLineageWithDemo() {
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
      <AllocPctLineageView
        onStartDemo={handleStartDemo}
        demoExpandedLevel={demoActive ? demoExpandedLevel : undefined}
      />
      {demoActive && (
        <AllocPctLineageDemo
          onClose={handleCloseDemo}
          onSideEffect={handleSideEffect}
        />
      )}
    </>
  );
}
