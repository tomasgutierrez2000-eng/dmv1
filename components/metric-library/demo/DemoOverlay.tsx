'use client';

import React from 'react';

/* ────────────────────────────────────────────────────────────────────────────
 * DemoOverlay — semi-transparent backdrop with spotlight cutout
 *
 * Uses the box-shadow technique: a positioned div with
 *   box-shadow: 0 0 0 9999px rgba(0,0,0,0.55)
 * creates a "window" that reveals the target section while dimming everything
 * else. The cutout smoothly transitions between step targets.
 * ──────────────────────────────────────────────────────────────────────────── */

interface DemoOverlayProps {
  targetRect: DOMRect | null;
  isTransitioning: boolean;
  /** Whether to show the overlay (false during variant picker) */
  visible: boolean;
}

const PADDING = 16; // breathing room around the target

export default function DemoOverlay({ targetRect, isTransitioning, visible }: DemoOverlayProps) {
  if (!visible) return null;

  // If no target rect yet, show full dark overlay
  if (!targetRect) {
    return (
      <div
        className="fixed inset-0 z-[50] bg-black/55 pointer-events-none"
        aria-hidden="true"
      />
    );
  }

  const left = targetRect.left - PADDING;
  const top = targetRect.top - PADDING;
  const width = targetRect.width + PADDING * 2;
  const height = targetRect.height + PADDING * 2;

  return (
    <>
      {/* Click-through backdrop — the cutout box-shadow creates the dimming */}
      <div className="fixed inset-0 z-[50] pointer-events-none" aria-hidden="true">
        <div
          className="absolute rounded-xl border-2 border-pwc-orange/80"
          style={{
            left,
            top,
            width,
            height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            transition: isTransitioning
              ? 'none'
              : 'left 400ms cubic-bezier(0.16,1,0.3,1), top 400ms cubic-bezier(0.16,1,0.3,1), width 400ms cubic-bezier(0.16,1,0.3,1), height 400ms cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>

      {/* Glow pulse ring */}
      <div className="fixed inset-0 z-[50] pointer-events-none" aria-hidden="true">
        <div
          className="absolute rounded-xl"
          style={{
            left: left - 2,
            top: top - 2,
            width: width + 4,
            height: height + 4,
            boxShadow: '0 0 20px 4px rgba(208, 74, 2, 0.25)',
            transition: isTransitioning
              ? 'none'
              : 'left 400ms cubic-bezier(0.16,1,0.3,1), top 400ms cubic-bezier(0.16,1,0.3,1), width 400ms cubic-bezier(0.16,1,0.3,1), height 400ms cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
    </>
  );
}
