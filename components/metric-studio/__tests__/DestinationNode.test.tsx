import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DestinationNode } from '../nodes/DestinationNode';
import type { DestinationNodeData } from '@/lib/metric-studio/types';

// Mock React Flow handles — use createElement to avoid JSX parse issues in mock factory
vi.mock('@xyflow/react', () => {
  const React = require('react');
  return {
    Handle: ({ position }: { position: string }) => React.createElement('div', { 'data-testid': `handle-${position}` }),
    Position: { Left: 'left', Right: 'right' },
  };
});

const baseData: DestinationNodeData = {
  type: 'destination',
  tableName: 'exposure_metric_cube',
  layer: 'l3',
  targetColumn: 'metric_value',
  fields: [
    { name: 'metric_value', dataType: 'NUMERIC(20,4)' },
    { name: 'facility_id', dataType: 'BIGINT' },
    { name: 'as_of_date', dataType: 'DATE' },
  ],
  category: 'Exposure & Position',
  isGhost: false,
  zoomLevel: 'analyst',
};

const baseProps = {
  id: 'dest-1',
  type: 'destinationNode' as const,
  selected: false,
  dragging: false,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  zIndex: 0,
  sourcePosition: undefined,
  targetPosition: undefined,
  dragHandle: undefined,
  parentId: undefined,
  deletable: true,
  selectable: true,
  width: 200,
  height: 100,
};

describe('DestinationNode', () => {
  it('renders table name and L3 badge', () => {
    render(<DestinationNode {...baseProps} data={baseData} />);
    expect(screen.getByText('L3')).toBeInTheDocument();
    expect(screen.getByText('exposure_metric_cube')).toBeInTheDocument();
  });

  it('renders target column with arrow indicator', () => {
    render(<DestinationNode {...baseProps} data={baseData} />);
    expect(screen.getByText('→ metric_value')).toBeInTheDocument();
  });

  it('renders category and field count in footer', () => {
    render(<DestinationNode {...baseProps} data={baseData} />);
    expect(screen.getByText('Exposure & Position')).toBeInTheDocument();
    expect(screen.getByText('3 fields')).toBeInTheDocument();
  });

  it('shows aria-label for accessibility', () => {
    render(<DestinationNode {...baseProps} data={baseData} />);
    const el = screen.getByLabelText('L3 destination table: exposure_metric_cube');
    expect(el).toBeInTheDocument();
  });

  it('shows ghost variant with ? placeholder', () => {
    const ghostData: DestinationNodeData = {
      ...baseData,
      tableName: 'unknown',
      isGhost: true,
      fields: [],
    };
    render(<DestinationNode {...baseProps} data={ghostData} />);
    expect(screen.getByText('Unknown destination')).toBeInTheDocument();
    expect(screen.getByText(/destination not mapped/)).toBeInTheDocument();
  });

  it('shows ghost aria-label', () => {
    const ghostData: DestinationNodeData = {
      ...baseData,
      isGhost: true,
      fields: [],
    };
    render(<DestinationNode {...baseProps} data={ghostData} />);
    expect(screen.getByLabelText('L3 destination table: unknown')).toBeInTheDocument();
  });

  it('shows only badge and name at CRO zoom', () => {
    const croData: DestinationNodeData = { ...baseData, zoomLevel: 'cro' };
    render(<DestinationNode {...baseProps} data={croData} />);
    expect(screen.getByText('exposure_metric_cube')).toBeInTheDocument();
    expect(screen.queryByText('→ metric_value')).not.toBeInTheDocument();
  });

  it('shows fields with data types at validator zoom', () => {
    const valData: DestinationNodeData = { ...baseData, zoomLevel: 'validator' };
    render(<DestinationNode {...baseProps} data={valData} />);
    expect(screen.getByText('facility_id')).toBeInTheDocument();
    expect(screen.getByText('BIGINT')).toBeInTheDocument();
  });

  it('applies selection ring when selected', () => {
    const { container } = render(<DestinationNode {...baseProps} data={baseData} selected={true} />);
    const outer = container.firstElementChild;
    expect(outer?.className).toContain('ring-1');
    expect(outer?.className).toContain('ring-[#D04A02]');
  });

  it('has dashed rose border', () => {
    const { container } = render(<DestinationNode {...baseProps} data={baseData} />);
    const outer = container.firstElementChild;
    expect(outer?.className).toContain('border-dashed');
    expect(outer?.className).toContain('border-rose-500/30');
  });
});
