'use client';

import { useMemo } from 'react';
import { useModelStore } from '../../store/modelStore';
import { layerColors } from '../../utils/colors';

export default function Minimap() {
  const {
    model,
    tablePositions,
    zoom,
    pan,
    showMinimap,
    visibleLayers,
    tableSize,
    setPan,
    setZoom,
  } = useModelStore();

  const bounds = useMemo(() => {
    if (!model) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

    const visibleTables = Object.values(model.tables).filter((table) =>
      visibleLayers[table.layer]
    );
    const positions = visibleTables.map((t) => tablePositions[t.key] || { x: 0, y: 0 });

    if (positions.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

    // Use dynamic table dimensions based on table size
    const BASE_TABLE_WIDTH = 480;
    const BASE_TABLE_HEIGHT = 280;
    const SIZE_MULTIPLIERS = {
      small: { width: 0.75, height: 0.85 },
      medium: { width: 1.0, height: 1.0 },
      large: { width: 1.3, height: 1.2 },
    };
    const multiplier = SIZE_MULTIPLIERS[tableSize];
    const tableWidth = BASE_TABLE_WIDTH * multiplier.width;
    const tableHeight = BASE_TABLE_HEIGHT * multiplier.height;
    
    const minX = Math.min(...positions.map((p) => p.x));
    const maxX = Math.max(...positions.map((p) => p.x + tableWidth));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxY = Math.max(...positions.map((p) => p.y + tableHeight));

    return { minX, maxX, minY, maxY };
  }, [model, tablePositions, visibleLayers, tableSize]);

  const scale = useMemo(() => {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const minimapSize = 200;
    return Math.min(minimapSize / width, minimapSize / height, 1);
  }, [bounds]);

  if (!showMinimap || !model) return null;

  const visibleTables = Object.values(model.tables).filter((table) =>
    visibleLayers[table.layer]
  );

  const viewportWidth = 1200 / zoom;
  const viewportHeight = 800 / zoom;
  const viewportX = (-pan.x / zoom - bounds.minX) * scale;
  const viewportY = (-pan.y / zoom - bounds.minY) * scale;

  return (
    <div className="absolute bottom-4 right-4 w-48 h-48 bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
      <div className="relative w-full h-full">
        <svg width="100%" height="100%" className="absolute inset-0">
          {/* Tables as dots */}
          {visibleTables.map((table) => {
            const pos = tablePositions[table.key] || { x: 0, y: 0 };
            const x = (pos.x - bounds.minX) * scale;
            const y = (pos.y - bounds.minY) * scale;
            const colors = layerColors[table.layer];
            return (
              <circle
                key={table.key}
                cx={x}
                cy={y}
                r={3}
                fill={colors.primary}
                className="cursor-pointer hover:r-4 transition-all"
                onClick={() => {
                  setPan({
                    x: -(pos.x * zoom - 600),
                    y: -(pos.y * zoom - 400),
                  });
                }}
              />
            );
          })}

          {/* Viewport rectangle */}
          <rect
            x={viewportX}
            y={viewportY}
            width={viewportWidth * scale}
            height={viewportHeight * scale}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeDasharray="4,4"
            className="cursor-move"
            onMouseDown={(e) => {
              // Allow dragging viewport
              const startX = e.clientX;
              const startY = e.clientY;
              const startPan = { ...pan };

              const handleMove = (moveEvent: MouseEvent) => {
                const deltaX = (moveEvent.clientX - startX) / scale / zoom;
                const deltaY = (moveEvent.clientY - startY) / scale / zoom;
                setPan({
                  x: startPan.x - deltaX * zoom,
                  y: startPan.y - deltaY * zoom,
                });
              };

              const handleUp = () => {
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleUp);
              };

              document.addEventListener('mousemove', handleMove);
              document.addEventListener('mouseup', handleUp);
            }}
          />
        </svg>
      </div>
    </div>
  );
}
