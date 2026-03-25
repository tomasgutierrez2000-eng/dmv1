import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableNode } from '../nodes/TableNode';
import type { TableNodeData } from '@/lib/metric-studio/types';

vi.mock('@xyflow/react', () => {
  const React = require('react');
  return {
    Handle: ({ position }: { position: string }) => React.createElement('div', { 'data-testid': `handle-${position}` }),
    Position: { Left: 'left', Right: 'right' },
  };
});

const baseProps = {
  id: 'node-1',
  type: 'tableNode' as const,
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

describe('TableNode — L1 visual distinction', () => {
  const l1Data: TableNodeData = {
    type: 'table',
    tableName: 'currency_dim',
    layer: 'l1',
    fields: ['currency_code', 'currency_name'],
    selectedFields: ['currency_code', 'currency_name'],
    zoomLevel: 'analyst',
  };

  it('renders REF label for L1 tables', () => {
    render(<TableNode {...baseProps} data={l1Data} />);
    expect(screen.getByText('REF')).toBeInTheDocument();
  });

  it('renders L1 badge', () => {
    render(<TableNode {...baseProps} data={l1Data} />);
    expect(screen.getByText('L1')).toBeInTheDocument();
  });

  it('has dashed border for L1 tables', () => {
    const { container } = render(<TableNode {...baseProps} data={l1Data} />);
    const outer = container.firstElementChild;
    expect(outer?.className).toContain('border-dashed');
  });

  it('has smaller max-width for L1 tables', () => {
    const { container } = render(<TableNode {...baseProps} data={l1Data} />);
    const outer = container.firstElementChild;
    expect(outer?.className).toContain('max-w-[200px]');
  });

  it('has teal border color for L1 tables', () => {
    const { container } = render(<TableNode {...baseProps} data={l1Data} />);
    const outer = container.firstElementChild;
    expect(outer?.className).toContain('border-teal-500/30');
  });
});

describe('TableNode — L2 no regression', () => {
  const l2Data: TableNodeData = {
    type: 'table',
    tableName: 'facility_exposure_snapshot',
    layer: 'l2',
    fields: ['facility_id', 'drawn_amount'],
    selectedFields: ['facility_id', 'drawn_amount'],
    zoomLevel: 'analyst',
  };

  it('does NOT render REF label for L2 tables', () => {
    render(<TableNode {...baseProps} data={l2Data} />);
    expect(screen.queryByText('REF')).not.toBeInTheDocument();
  });

  it('does NOT have dashed border for L2', () => {
    const { container } = render(<TableNode {...baseProps} data={l2Data} />);
    const outer = container.firstElementChild;
    expect(outer?.className).not.toContain('border-dashed');
  });

  it('has larger max-width for L2', () => {
    const { container } = render(<TableNode {...baseProps} data={l2Data} />);
    const outer = container.firstElementChild;
    expect(outer?.className).toContain('max-w-[260px]');
  });

  it('has violet border for L2', () => {
    const { container } = render(<TableNode {...baseProps} data={l2Data} />);
    const outer = container.firstElementChild;
    expect(outer?.className).toContain('border-violet-500/30');
  });

  it('renders L2 badge', () => {
    render(<TableNode {...baseProps} data={l2Data} />);
    expect(screen.getByText('L2')).toBeInTheDocument();
  });
});
