'use client';

import React, { useState, useCallback } from 'react';
import CollMvLineageView from '@/components/metric-library/CollMvLineageView';
import CollMvLineageDemo from '@/components/metric-library/CollMvLineageDemo';
import type { DemoSideEffects } from '@/components/metric-library/demo/useDemoEngine';

/* ────────────────────────────────────────────────────────────────────────────
 * CollMvLineageWithDemo — client wrapper that manages demo lifecycle
 *
 * Holds demoActive state and passes demo-controlled overrides to the
 * CollMvLineageView (expandedLevel) when the demo is running.
 * ──────────────────────────────────────────────────────────────────────────── */

export default function CollMvLineageWithDemo() {
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
      <CollMvLineageView
        onStartDemo={handleStartDemo}
        demoExpandedLevel={demoActive ? demoExpandedLevel : undefined}
      />
      {demoActive && (
        <CollMvLineageDemo
          onClose={handleCloseDemo}
          onSideEffect={handleSideEffect}
        />
      )}
    </>
  );
}
