'use client';

import { Key, Link2 } from 'lucide-react';

const LAYER_COLORS: Record<string, string> = {
  L1: 'bg-blue-100 text-blue-800 border border-blue-200',
  L2: 'bg-amber-100 text-amber-800 border border-amber-200',
  L3: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
};

const LAYER_COLORS_DARK: Record<string, string> = {
  L1: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  L2: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  L3: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
};

export function LayerBadge({
  layer,
  dark = false,
  size = 'sm',
}: {
  layer: string;
  dark?: boolean;
  size?: 'sm' | 'lg';
}) {
  const colors = dark ? LAYER_COLORS_DARK : LAYER_COLORS;
  const sizeClass = size === 'lg' ? 'text-sm px-2.5 py-1' : 'text-xs px-2 py-0.5';
  return (
    <span
      className={`font-semibold rounded-full ${sizeClass} ${colors[layer] ?? 'bg-gray-100 text-gray-700 border border-gray-200'}`}
      aria-label={`Layer: ${layer}`}
    >
      {layer}
    </span>
  );
}

export function DataTypeBadge({ type }: { type: string }) {
  return (
    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
      {type}
    </span>
  );
}

export function PKBadge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
      aria-label="Primary Key"
    >
      <Key className="w-3 h-3" aria-hidden />
      PK
    </span>
  );
}

export function FKBadge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
      aria-label="Foreign Key"
    >
      <Link2 className="w-3 h-3" aria-hidden />
      FK
    </span>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
      {category}
    </span>
  );
}
