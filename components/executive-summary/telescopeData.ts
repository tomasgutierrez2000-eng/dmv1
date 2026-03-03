import { STAGES, STAGE_CONNECTIONS } from '../architecture/architectureData';
import type { ArchStage, ArchNode, StageConnection } from '../architecture/architectureData';

/* ═══════════════════════════════════════════════════════════════════════════
 * Re-export architecture data for Telescope
 * ═══════════════════════════════════════════════════════════════════════════ */

export { STAGES, STAGE_CONNECTIONS };
export type { ArchStage, ArchNode, StageConnection };

/* ═══════════════════════════════════════════════════════════════════════════
 * Stage summary stats (shown in bird's-eye view)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const STAGE_STATS: Record<string, { stat: string; detail: string }> = {
  sources:     { stat: '8',   detail: 'upstream systems' },
  ingestion:   { stat: '4',   detail: 'pipeline stages' },
  canonical:   { stat: '104', detail: 'tables (L1 + L2)' },
  engine:      { stat: '27',  detail: 'metric variants' },
  outputs:     { stat: '49',  detail: 'L3 tables' },
  consumption: { stat: '5',   detail: 'delivery channels' },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Zoom levels
 * ═══════════════════════════════════════════════════════════════════════════ */

export type ZoomLevel = 'orbit' | 'stage' | 'node';

export interface TelescopeState {
  zoom: ZoomLevel;
  stageId: string | null;
  nodeId: string | null;
}

export const INITIAL_TELESCOPE: TelescopeState = {
  zoom: 'orbit',
  stageId: null,
  nodeId: null,
};

export type TelescopeAction =
  | { type: 'ZOOM_STAGE'; stageId: string }
  | { type: 'ZOOM_NODE'; nodeId: string }
  | { type: 'ZOOM_OUT' }
  | { type: 'ZOOM_ORBIT' };

export function telescopeReducer(
  state: TelescopeState,
  action: TelescopeAction,
): TelescopeState {
  switch (action.type) {
    case 'ZOOM_STAGE':
      return { zoom: 'stage', stageId: action.stageId, nodeId: null };
    case 'ZOOM_NODE':
      return { ...state, zoom: 'node', nodeId: action.nodeId };
    case 'ZOOM_OUT':
      if (state.zoom === 'node')
        return { ...state, zoom: 'stage', nodeId: null };
      return INITIAL_TELESCOPE;
    case 'ZOOM_ORBIT':
      return INITIAL_TELESCOPE;
    default:
      return state;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Helpers
 * ═══════════════════════════════════════════════════════════════════════════ */

export function getStageById(id: string): ArchStage | undefined {
  return STAGES.find((s) => s.id === id);
}

export function getNodeById(stageId: string, nodeId: string): ArchNode | undefined {
  const stage = getStageById(stageId);
  return stage?.nodes.find((n) => n.id === nodeId);
}
