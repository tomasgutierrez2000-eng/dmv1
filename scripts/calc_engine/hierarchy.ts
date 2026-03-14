/**
 * Build desk/portfolio/LOB lookup from enterprise_business_taxonomy.
 *
 * Port of scripts/calc_engine/hierarchy.py to TypeScript.
 */

export interface HierarchyInfo {
  deskName: string;
  deskSegmentId: number | null;
  portfolioName: string;
  portfolioSegmentId: number | null;
  lobName: string;
  lobSegmentId: number | null;
}

interface HierarchyNode {
  segmentId: number;
  segmentName: string;
  treeLevel: string;
  parentSegmentId: number | null;
}

const UNKNOWN = 'Unknown';

/**
 * Build a map from lob_segment_id → HierarchyInfo.
 *
 * The enterprise_business_taxonomy table has a self-referential tree:
 *   L3 (desk) → L2 (portfolio) → L1 (business segment)
 * via parent_segment_id.
 *
 * facility_master.lob_segment_id points to an L3 leaf node.
 * We walk up to resolve portfolio and LOB names.
 */
export function buildHierarchyLookup(
  rows: Record<string, unknown>[]
): Map<number, HierarchyInfo> {
  // Determine column names (may vary between data sources)
  const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];
  const nameCol = columns.includes('segment_name') ? 'segment_name' : 'description';
  const parentCol = columns.includes('parent_segment_id') ? 'parent_segment_id' : 'parent';
  const levelCol = columns.includes('tree_level') ? 'tree_level' : 'level';

  // Build node map
  const nodes = new Map<number, HierarchyNode>();
  for (const row of rows) {
    const sid = toInt(row['managed_segment_id']);
    if (sid === null) continue;
    nodes.set(sid, {
      segmentId: sid,
      segmentName: String(row[nameCol] ?? UNKNOWN),
      treeLevel: String(row[levelCol] ?? ''),
      parentSegmentId: toInt(row[parentCol]),
    });
  }

  // For each node, walk up to resolve desk/portfolio/lob
  const lookup = new Map<number, HierarchyInfo>();
  for (const [sid, node] of nodes) {
    let desk = UNKNOWN, portfolio = UNKNOWN, lob = UNKNOWN;
    let deskId: number | null = null, portfolioId: number | null = null, lobId: number | null = null;

    let current: HierarchyNode | undefined = node;
    const visited = new Set<number>();
    while (current && !visited.has(current.segmentId)) {
      visited.add(current.segmentId);
      const lvl = current.treeLevel;
      if (lvl === 'L3' || lvl === '3') {
        desk = current.segmentName;
        deskId = current.segmentId;
      } else if (lvl === 'L2' || lvl === '2') {
        portfolio = current.segmentName;
        portfolioId = current.segmentId;
      } else if (lvl === 'L1' || lvl === '1') {
        lob = current.segmentName;
        lobId = current.segmentId;
      }
      current = current.parentSegmentId != null
        ? nodes.get(current.parentSegmentId)
        : undefined;
    }

    lookup.set(sid, {
      deskName: desk,
      deskSegmentId: deskId,
      portfolioName: portfolio,
      portfolioSegmentId: portfolioId,
      lobName: lob,
      lobSegmentId: lobId,
    });
  }

  return lookup;
}

function toInt(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n) : null;
}
