'use client';

import { useRouter } from 'next/navigation';
import type { DataDictionaryRelationship } from '@/lib/data-dictionary';

const LAYER_FILL: Record<string, string> = {
  L1: '#3b82f6',  // blue-500
  L2: '#f59e0b',  // amber-500
  L3: '#10b981',  // emerald-500
};

const MAX_NODES = 12;

interface RelationshipMiniGraphProps {
  tableName: string;
  layer: string;
  outgoing: DataDictionaryRelationship[];
  incoming: DataDictionaryRelationship[];
}

interface ConnectedTable {
  name: string;
  layer: string;
  direction: 'out' | 'in';
}

export default function RelationshipMiniGraph({
  tableName,
  layer,
  outgoing,
  incoming,
}: RelationshipMiniGraphProps) {
  const router = useRouter();

  // Deduplicate connected tables
  const connected = new Map<string, ConnectedTable>();
  for (const r of outgoing) {
    const key = `${r.to_layer}.${r.to_table}`;
    if (!connected.has(key)) {
      connected.set(key, { name: r.to_table, layer: r.to_layer, direction: 'out' });
    }
  }
  for (const r of incoming) {
    const key = `${r.from_layer}.${r.from_table}`;
    if (!connected.has(key)) {
      connected.set(key, { name: r.from_table, layer: r.from_layer, direction: 'in' });
    }
  }

  const allConnected = Array.from(connected.values());
  const shown = allConnected.slice(0, MAX_NODES);
  const overflow = allConnected.length - shown.length;

  if (shown.length === 0) {
    return (
      <p className="text-xs text-gray-600">No relationships to visualize.</p>
    );
  }

  // Layout: center node with spokes arranged in a circle
  const cx = 250;
  const cy = 150;
  const radius = 120;
  const width = 500;
  const height = 300;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-lg"
        aria-label={`Relationship graph for ${layer}.${tableName}`}
      >
        {/* Lines */}
        {shown.map((node, i) => {
          const angle = (2 * Math.PI * i) / shown.length - Math.PI / 2;
          const nx = cx + radius * Math.cos(angle);
          const ny = cy + radius * Math.sin(angle);
          return (
            <line
              key={`line-${node.layer}.${node.name}`}
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke={node.direction === 'out' ? '#4b5563' : '#374151'}
              strokeWidth={1.5}
              strokeDasharray={node.direction === 'in' ? '4 2' : undefined}
            />
          );
        })}

        {/* Spoke nodes */}
        {shown.map((node, i) => {
          const angle = (2 * Math.PI * i) / shown.length - Math.PI / 2;
          const nx = cx + radius * Math.cos(angle);
          const ny = cy + radius * Math.sin(angle);
          const fill = LAYER_FILL[node.layer] ?? '#6b7280';
          return (
            <g
              key={`node-${node.layer}.${node.name}`}
              className="cursor-pointer"
              onClick={() => router.push(`/data-elements/${node.layer}/${encodeURIComponent(node.name)}`)}
            >
              <circle cx={nx} cy={ny} r={8} fill={fill} opacity={0.8} />
              <text
                x={nx}
                y={ny + 18}
                textAnchor="middle"
                className="text-[8px] fill-gray-400 font-mono"
              >
                {node.name.length > 16 ? node.name.slice(0, 14) + '...' : node.name}
              </text>
            </g>
          );
        })}

        {/* Center node */}
        <circle cx={cx} cy={cy} r={14} fill={LAYER_FILL[layer] ?? '#6b7280'} />
        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          className="text-[9px] fill-gray-200 font-mono font-bold"
        >
          {tableName.length > 20 ? tableName.slice(0, 18) + '...' : tableName}
        </text>
      </svg>
      {overflow > 0 && (
        <p className="text-[10px] text-gray-500 text-center mt-1">
          +{overflow} more connected table{overflow !== 1 ? 's' : ''} (see relationships panel below)
        </p>
      )}
    </div>
  );
}
