'use client';

interface ConnectionArrowProps {
  label?: string;
  direction?: 'right' | 'down';
  animated?: boolean;
}

export default function ConnectionArrow({
  label,
  direction = 'right',
  animated = true,
}: ConnectionArrowProps) {
  const isHorizontal = direction === 'right';

  if (isHorizontal) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-1 shrink-0 self-center">
        <svg width="60" height="24" viewBox="0 0 60 24" className="overflow-visible">
          <defs>
            <marker
              id="arrow-right"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#475569" />
            </marker>
          </defs>
          <line
            x1="0"
            y1="12"
            x2="50"
            y2="12"
            stroke="#475569"
            strokeWidth="2"
            markerEnd="url(#arrow-right)"
            strokeDasharray={animated ? '6 4' : 'none'}
          >
            {animated && (
              <animate
                attributeName="stroke-dashoffset"
                from="20"
                to="0"
                dur="1.5s"
                repeatCount="indefinite"
              />
            )}
          </line>
        </svg>
        {label && (
          <span className="text-[9px] text-slate-500 font-mono whitespace-nowrap leading-none">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-1">
      <svg width="24" height="32" viewBox="0 0 24 32" className="overflow-visible">
        <defs>
          <marker
            id="arrow-down"
            markerWidth="6"
            markerHeight="5"
            refX="3"
            refY="5"
            orient="auto"
          >
            <polygon points="0 0, 6 0, 3 5" fill="#475569" />
          </marker>
        </defs>
        <line
          x1="12"
          y1="0"
          x2="12"
          y2="24"
          stroke="#475569"
          strokeWidth="2"
          markerEnd="url(#arrow-down)"
          strokeDasharray={animated ? '6 4' : 'none'}
        >
          {animated && (
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur="1.5s"
              repeatCount="indefinite"
            />
          )}
        </line>
      </svg>
      {label && (
        <span className="text-[9px] text-slate-500 font-mono whitespace-nowrap leading-none mt-1">
          {label}
        </span>
      )}
    </div>
  );
}
