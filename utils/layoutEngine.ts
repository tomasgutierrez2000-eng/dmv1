import type { DataModel, TableDef, TablePosition } from '../types/model';

export type LayoutMode = 'domain-overview' | 'snowflake';

export type TableSize = 'small' | 'medium' | 'large';

export type VisibleLayers = { L1: boolean; L2: boolean; L3: boolean };

/** Overview table dimensions by size (used by layout, Canvas, and TableNode) - larger for readability */
export function getOverviewTableDimensions(tableSize: TableSize): { width: number; height: number } {
  switch (tableSize) {
    case 'small': return { width: 200, height: 160 };
    case 'medium': return { width: 240, height: 190 };
    case 'large': return { width: 280, height: 220 };
    default: return { width: 240, height: 190 };
  }
}

/** Pure-SVG overview card geometry constants (shared by TableNode and RelationshipLine) */
export const OVERVIEW_CARD = {
  HEADER_H: 32,
  FOOTER_H: 20,
  LINE_H: 15,
  PAD_X: 10,
  PAD_Y: 6,
  RADIUS: 8,
  FIELD_OFFSET: 11, // baseline offset from content-area top to first field text
} as const;

/** Compact overview: smaller cards and tighter spacing so more tables fit on screen; height fits header + PK/FK lines + footer */
export function getCompactOverviewTableDimensions(): { width: number; height: number } {
  return { width: 148, height: 70 };
}

export function calculateLayout(
  model: DataModel,
  mode: LayoutMode,
  existingPositions: Record<string, TablePosition>,
  zoom?: number,
  tableSize?: TableSize,
  visibleLayers?: VisibleLayers,
  compactOverview?: boolean
): Record<string, TablePosition> {
  const positions: Record<string, TablePosition> = { ...existingPositions };
  let tables = Object.values(model.tables);
  
  const zoomSpacingMultiplier = zoom ? Math.max(1.0, 1.0 / Math.max(0.3, zoom)) : 1.0;
  const size = tableSize ?? 'medium';

  if (mode === 'domain-overview') {
    if (visibleLayers) {
      tables = tables.filter((t) => visibleLayers[t.layer]);
    }
    return calculateDomainOverviewLayout(tables, positions, model, zoomSpacingMultiplier, size, compactOverview ?? false);
  }
  if (mode === 'snowflake') {
    if (visibleLayers) {
      tables = tables.filter((t) => visibleLayers[t.layer]);
    }
    return calculateSnowflakeLayout(tables, positions, model, zoomSpacingMultiplier, size, compactOverview ?? false);
  }
  // Fallback (should not be reached with current LayoutMode)
  return calculateDomainOverviewLayout(tables, positions, model, zoomSpacingMultiplier, size, compactOverview ?? false);
}

function calculateDomainOverviewLayout(
  tables: TableDef[],
  existingPositions: Record<string, TablePosition>,
  model?: DataModel,
  spacingMultiplier: number = 1.0,
  tableSize: TableSize = 'medium',
  compactView: boolean = false
): Record<string, TablePosition> {
  const positions: Record<string, TablePosition> = {};
  
  if (!model) {
    const { width: W, height: H } = compactView ? getCompactOverviewTableDimensions() : getOverviewTableDimensions(tableSize);
    const gap = compactView ? 6 : 10;
    const cols = Math.max(1, Math.floor((typeof window !== 'undefined' ? window.innerWidth : 2400 - 24) / (W + gap)));
    tables.forEach((table, i) => {
      if (existingPositions[table.key]) {
        positions[table.key] = existingPositions[table.key];
      } else {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions[table.key] = { x: 6 + col * (W + gap), y: 8 + row * (H + gap) };
      }
    });
    return positions;
  }

  const { width: OVERVIEW_TABLE_WIDTH, height: OVERVIEW_TABLE_HEIGHT } = compactView
    ? getCompactOverviewTableDimensions()
    : getOverviewTableDimensions(tableSize);
  const TABLE_SPACING = compactView ? 4 : 6;
  const DOMAIN_SPACING = compactView ? 8 : 12;
  const DOMAIN_PADDING = compactView ? 8 : 12;
  const DOMAIN_HEADER_HEIGHT = compactView ? 26 : 36;
  const LAYER_GAP = compactView ? 6 : 10;

  // Group tables by domain
  const byDomain = new Map<string, TableDef[]>();
  tables.forEach((table) => {
    const domain = table.category || 'Uncategorized';
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(table);
  });

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 2400;
  const viewportPadding = 16;
  const startX = viewportPadding;
  const startY = viewportPadding;
  const availableWidth = Math.max(viewportWidth - viewportPadding * 2, 1200);

  let domains = Array.from(byDomain.keys());
  if (domains.length === 0) return positions;

  // Sort domains by model.categories order so the main view groups by category in a consistent order
  if (model.categories && model.categories.length > 0) {
    domains = domains.sort((a, b) => {
      const ai = model.categories.indexOf(a);
      const bi = model.categories.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    });
  } else {
    domains.sort((a, b) => byDomain.get(b)!.length - byDomain.get(a)!.length);
  }

  const maxTablesPerRow = Math.max(1, Math.floor((availableWidth - startX * 2 - DOMAIN_PADDING * 2) / (OVERVIEW_TABLE_WIDTH + TABLE_SPACING)));
  const rowWidthTotal = availableWidth - startX * 2;
  const minDomainWidthConst = OVERVIEW_TABLE_WIDTH + DOMAIN_PADDING * 2;
  // Target a square-ish grid: ~sqrt(N) domains per row for balanced horizontal/vertical layout
  const targetDomainsPerRow = Math.max(1, Math.min(domains.length, Math.ceil(Math.sqrt(domains.length))));
  const maxDomainWidthPerDomain = Math.max(
    minDomainWidthConst,
    Math.floor((rowWidthTotal - (targetDomainsPerRow - 1) * DOMAIN_SPACING) / targetDomainsPerRow)
  );
  const maxDomainWidth = rowWidthTotal;

  // Per-domain: width from content, capped so more domains fit per row (squarer layout)
  const domainHeights = new Map<string, number>();
  const domainWidths = new Map<string, number>();

  domains.forEach((domain) => {
    const domainTables = byDomain.get(domain)!;
    const byLayer = { L1: [] as TableDef[], L2: [] as TableDef[], L3: [] as TableDef[] };
    domainTables.forEach(t => byLayer[t.layer].push(t));
    const maxTablesInLayer = Math.max(byLayer.L1.length, byLayer.L2.length, byLayer.L3.length);
    const tablesPerRow = Math.min(maxTablesInLayer, maxTablesPerRow);
    const contentWidth = tablesPerRow * (OVERVIEW_TABLE_WIDTH + TABLE_SPACING) - TABLE_SPACING;
    const minDomainWidth = minDomainWidthConst;
    // Cap width so we get at least targetDomainsPerRow per row → squarer, balanced grid
    const domainWidth = Math.max(minDomainWidth, Math.min(contentWidth + DOMAIN_PADDING * 2, maxDomainWidthPerDomain, maxDomainWidth));
    domainWidths.set(domain, domainWidth);

    const effectiveWidth = domainWidth - DOMAIN_PADDING * 2;
    const actualTablesPerRow = Math.max(1, Math.min(maxTablesInLayer, Math.floor(effectiveWidth / (OVERVIEW_TABLE_WIDTH + TABLE_SPACING))));

    let cumulativeY = DOMAIN_HEADER_HEIGHT + DOMAIN_PADDING;
    (['L1', 'L2', 'L3'] as const).forEach((layer) => {
      if (byLayer[layer].length > 0) {
        const layerRows = Math.ceil(byLayer[layer].length / actualTablesPerRow);
        const layerHeight = layerRows * OVERVIEW_TABLE_HEIGHT + (layerRows - 1) * TABLE_SPACING;
        cumulativeY += layerHeight + LAYER_GAP;
      }
    });
    const activeLayerCount = (['L1', 'L2', 'L3'] as const).filter(l => byLayer[l].length > 0).length;
    if (activeLayerCount > 0) cumulativeY -= LAYER_GAP;

    const totalContentHeight = cumulativeY - (DOMAIN_HEADER_HEIGHT + DOMAIN_PADDING);
    const domainHeight = DOMAIN_HEADER_HEIGHT + DOMAIN_PADDING * 2 + totalContentHeight;
    const minHeight = DOMAIN_HEADER_HEIGHT + DOMAIN_PADDING * 2 + OVERVIEW_TABLE_HEIGHT;
    domainHeights.set(domain, Math.max(domainHeight, minHeight));
  });

  // Place domains back-to-back (variable width), wrap when row full
  let currentX = startX;
  let currentY = startY;
  let maxYInRow = startY;

  domains.forEach((domain) => {
    const domainTables = byDomain.get(domain)!;
    const domainHeight = domainHeights.get(domain)!;
    const domainWidth = domainWidths.get(domain)!;

    // Wrap to next row if this domain would overflow
    if (currentX > startX && currentX + domainWidth > startX + maxDomainWidth) {
      currentX = startX;
      currentY = maxYInRow + DOMAIN_SPACING;
      maxYInRow = currentY;
    }

    const byLayer = { L1: [] as TableDef[], L2: [] as TableDef[], L3: [] as TableDef[] };
    domainTables.forEach(t => byLayer[t.layer].push(t));
    const maxTablesInLayer = Math.max(byLayer.L1.length, byLayer.L2.length, byLayer.L3.length);
    const effectiveWidth = domainWidth - DOMAIN_PADDING * 2;
    const tablesPerRow = Math.max(1, Math.min(maxTablesInLayer, Math.floor(effectiveWidth / (OVERVIEW_TABLE_WIDTH + TABLE_SPACING))));

    let cumulativeLayerY = DOMAIN_HEADER_HEIGHT + DOMAIN_PADDING;

    (['L1', 'L2', 'L3'] as const).forEach((layer) => {
      const layerTables = byLayer[layer];
      if (layerTables.length === 0) return;

      const layerStartY = cumulativeLayerY;
      let x = currentX + DOMAIN_PADDING;
      let rowY = currentY + layerStartY;
      let rowCount = 0;

      if (layerTables.length === 1) {
        const centerOffset = Math.max(0, (effectiveWidth - OVERVIEW_TABLE_WIDTH) / 2);
        x = currentX + DOMAIN_PADDING + centerOffset;
      }

      layerTables.forEach((table, idx) => {
        positions[table.key] = { x, y: rowY };

        x += OVERVIEW_TABLE_WIDTH + TABLE_SPACING;
        rowCount++;

        if (rowCount >= tablesPerRow && idx < layerTables.length - 1) {
          x = currentX + DOMAIN_PADDING;
          rowY += OVERVIEW_TABLE_HEIGHT + TABLE_SPACING;
          rowCount = 0;
        }
      });

      const layerRows = Math.ceil(layerTables.length / tablesPerRow);
      const layerHeight = layerRows * OVERVIEW_TABLE_HEIGHT + (layerRows - 1) * TABLE_SPACING;
      cumulativeLayerY += layerHeight + LAYER_GAP;
    });

    maxYInRow = Math.max(maxYInRow, currentY + domainHeight);
    currentX += domainWidth + DOMAIN_SPACING;
  });

  return positions;
}

function calculateSnowflakeLayout(
  tables: TableDef[],
  existingPositions: Record<string, TablePosition>,
  model: DataModel,
  spacingMultiplier: number = 1.0,
  tableSize: TableSize = 'medium',
  compactView: boolean = false
): Record<string, TablePosition> {
  const positions: Record<string, TablePosition> = {};
  if (tables.length === 0) return positions;

  const { width: cardW, height: cardH } = compactView
    ? getCompactOverviewTableDimensions()
    : getOverviewTableDimensions(tableSize);
  // Tighter but safe: cards must not touch (keep small gap)
  const spacing = (compactView ? 6 : 8) * spacingMultiplier;
  const minGap = Math.max(4, spacing);
  // Minimum radial step between rings so rings don't overlap
  const radialStep = Math.max(cardW, cardH) * 0.48 + minGap;
  // Minimum arc per card so nodes on same ring don't touch
  const minArcPerCard = cardW + minGap;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 2400;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1400;
  const cx = viewportWidth / 2;
  const cy = viewportHeight / 2;

  // Build undirected relationship graph
  const relationshipMap = new Map<string, Set<string>>();
  model.relationships.forEach((rel) => {
    if (!relationshipMap.has(rel.source.tableKey)) relationshipMap.set(rel.source.tableKey, new Set());
    if (!relationshipMap.has(rel.target.tableKey)) relationshipMap.set(rel.target.tableKey, new Set());
    relationshipMap.get(rel.source.tableKey)!.add(rel.target.tableKey);
    relationshipMap.get(rel.target.tableKey)!.add(rel.source.tableKey);
  });

  const tableKeys = new Set(tables.map((t) => t.key));
  tables.forEach((t) => {
    if (!relationshipMap.has(t.key)) relationshipMap.set(t.key, new Set());
  });

  // Pick hub: max degree; tie-break by L1 then alphabetically
  let hub: TableDef | null = null;
  let maxDegree = -1;
  tables.forEach((table) => {
    const degree = relationshipMap.get(table.key)?.size ?? 0;
    const effective = degree * 10 + (table.layer === 'L1' ? 2 : table.layer === 'L2' ? 1 : 0);
    if (effective > maxDegree || (effective === maxDegree && (!hub || table.key < hub.key))) {
      maxDegree = effective;
      hub = table;
    }
  });
  if (!hub) hub = tables[0];

  // BFS from hub to assign ring index (0 = center, 1, 2, ...)
  const ringIndex = new Map<string, number>();
  const queue: { key: string; dist: number }[] = [{ key: hub.key, dist: 0 }];
  const visited = new Set<string>([hub.key]);
  while (queue.length > 0) {
    const { key, dist } = queue.shift()!;
    ringIndex.set(key, dist);
    const neighbors = relationshipMap.get(key);
    if (neighbors) {
      neighbors.forEach((n) => {
        if (tableKeys.has(n) && !visited.has(n)) {
          visited.add(n);
          queue.push({ key: n, dist: dist + 1 });
        }
      });
    }
  }
  // Orphans (no relationships): put on one outer ring so they stay in view, not at ring 999 (would be far off-screen)
  const maxConnectedRing = Math.max(0, ...Array.from(ringIndex.values()));
  const outerRing = maxConnectedRing + 1;
  tables.forEach((t) => {
    if (!ringIndex.has(t.key)) ringIndex.set(t.key, outerRing);
  });

  // Group tables by ring, sort within ring for stable angles (e.g. by category then name)
  const byRing = new Map<number, TableDef[]>();
  tables.forEach((table) => {
    const r = ringIndex.get(table.key) ?? 999;
    if (!byRing.has(r)) byRing.set(r, []);
    byRing.get(r)!.push(table);
  });
  byRing.forEach((list) => {
    list.sort((a, b) => {
      const c = (a.category || '').localeCompare(b.category || '');
      if (c !== 0) return c;
      return a.key.localeCompare(b.key);
    });
  });

  const ringNumbers = Array.from(byRing.keys()).sort((a, b) => a - b);

  ringNumbers.forEach((ring) => {
    const list = byRing.get(ring)!;
    const n = list.length;
    // Ring 0: center. Ring > 0: ensure (1) min step from previous ring, (2) circumference fits n cards (no touch)
    const r =
      ring === 0
        ? 0
        : Math.max(
            radialStep * ring,
            (n * minArcPerCard) / (2 * Math.PI)
          );
    for (let i = 0; i < n; i++) {
      const table = list[i];
      if (existingPositions[table.key]) {
        positions[table.key] = existingPositions[table.key];
        continue;
      }
      const theta = n <= 1 ? 0 : (2 * Math.PI * i) / n;
      const centerX = cx + r * Math.cos(theta);
      const centerY = cy + r * Math.sin(theta);
      positions[table.key] = {
        x: centerX - cardW / 2,
        y: centerY - cardH / 2,
      };
    }
  });

  // Guarantee every table has a position (safety for any edge case)
  tables.forEach((table) => {
    if (!(table.key in positions)) {
      const lastRing = ringNumbers[ringNumbers.length - 1] ?? 0;
      const r = lastRing === 0 ? radialStep : Math.max(radialStep * (lastRing + 1), minArcPerCard / (2 * Math.PI));
      positions[table.key] = {
        x: cx + r - cardW / 2,
        y: cy - cardH / 2,
      };
    }
  });

  return positions;
}
