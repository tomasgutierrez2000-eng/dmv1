'use client';

import { useMemo } from 'react';

interface ParticleDef {
  id: string;
  path: string;
  durationS: number;
  delayS: number;
  color: string;
  radius: number;
}

interface PulseParticlesProps {
  currentAct: number;
  isPlaying: boolean;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/**
 * Generate a cubic bezier SVG path from (x1,y1) to (x2,y2) with some randomness.
 */
function makeCurvePath(
  x1: number, y1: number,
  x2: number, y2: number,
  variance: number = 40,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cx1 = mx + randomBetween(-variance, variance);
  const cy1 = y1 + randomBetween(-variance, variance);
  const cx2 = mx + randomBetween(-variance, variance);
  const cy2 = y2 + randomBetween(-variance, variance);
  return `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
}

function generateParticles(act: number): ParticleDef[] {
  const particles: ParticleDef[] = [];

  if (act === 0) {
    // Act 1: No flowing particles, just ambient dots
    return [];
  }

  if (act === 1) {
    // Act 2: Particles flow from left (sources) to center (ingestion)
    const sourceYPositions = [15, 25, 35, 45, 55, 65, 75, 85]; // % of viewport height
    for (let si = 0; si < 8; si++) {
      for (let pi = 0; pi < 3; pi++) {
        const yStart = sourceYPositions[si] + randomBetween(-3, 3);
        const yEnd = 50 + randomBetween(-15, 15);
        particles.push({
          id: `act2-${si}-${pi}`,
          path: makeCurvePath(
            randomBetween(2, 8), // percent from left
            yStart,
            randomBetween(40, 55),
            yEnd,
            12,
          ),
          durationS: randomBetween(2.5, 4),
          delayS: si * 0.3 + pi * 0.8,
          color: '#D04A02',
          radius: randomBetween(1.5, 3),
        });
      }
    }
    return particles;
  }

  if (act === 2) {
    // Act 3: Particles flow through processing tiers (left to right through center)
    for (let i = 0; i < 12; i++) {
      const yStart = randomBetween(25, 75);
      const yEnd = randomBetween(30, 70);
      particles.push({
        id: `act3-${i}`,
        path: makeCurvePath(
          randomBetween(25, 35),
          yStart,
          randomBetween(70, 80),
          yEnd,
          20,
        ),
        durationS: randomBetween(3, 5),
        delayS: i * 0.4,
        color: '#a78bfa',
        radius: randomBetween(1.5, 2.5),
      });
    }
    return particles;
  }

  if (act === 3) {
    // Act 4: Particles converge from center to right (dashboards)
    for (let i = 0; i < 16; i++) {
      const yStart = randomBetween(20, 80);
      const yEnd = randomBetween(25, 75);
      particles.push({
        id: `act4-${i}`,
        path: makeCurvePath(
          randomBetween(30, 50),
          yStart,
          randomBetween(85, 95),
          yEnd,
          15,
        ),
        durationS: randomBetween(2, 4),
        delayS: i * 0.25,
        color: '#f472b6',
        radius: randomBetween(1.5, 3),
      });
    }
    return particles;
  }

  return [];
}

export default function PulseParticles({ currentAct, isPlaying }: PulseParticlesProps) {
  const particles = useMemo(() => generateParticles(currentAct), [currentAct]);

  if (particles.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient id="pulse-particle-glow-orange">
          <stop offset="0%" stopColor="#D04A02" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#E87722" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D04A02" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pulse-particle-glow-purple">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pulse-particle-glow-pink">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#ec4899" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {particles.map((p) => {
        const glowId = p.color === '#a78bfa'
          ? 'pulse-particle-glow-purple'
          : p.color === '#f472b6'
            ? 'pulse-particle-glow-pink'
            : 'pulse-particle-glow-orange';

        return (
          <circle
            key={p.id}
            r={p.radius}
            fill={`url(#${glowId})`}
            opacity={0.8}
            style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
          >
            <animateMotion
              dur={`${p.durationS}s`}
              repeatCount="indefinite"
              path={p.path}
              begin={`${p.delayS}s`}
              calcMode="spline"
              keySplines="0.25 0.1 0.25 1"
              keyTimes="0;1"
            />
          </circle>
        );
      })}
    </svg>
  );
}
