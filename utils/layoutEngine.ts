import type { DataModel, TableDef, TablePosition } from '../types/model';

export type LayoutMode = 'grid' | 'force' | 'hierarchical' | 'domain' | 'domain-overview';

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

// Base dimensions - will be adjusted by view mode
// Note: Actual table dimensions are now dynamic based on tableSize setting
// These are used for layout calculations
const BASE_TABLE_WIDTH = 560;
const BASE_TABLE_HEIGHT = 320;
const BASE_SPACING = 88;

// Size multipliers for layout calculations (aligned with TableNode)
const SIZE_MULTIPLIERS = {
  small: { width: 0.8, height: 0.9, spacing: 0.8 },
  medium: { width: 1.0, height: 1.0, spacing: 1.0 },
  large: { width: 1.35, height: 1.25, spacing: 1.2 },
};

// Default to medium for layout calculations (can be made dynamic later)
const TABLE_WIDTH = BASE_TABLE_WIDTH * SIZE_MULTIPLIERS.medium.width;
const TABLE_HEIGHT = BASE_TABLE_HEIGHT * SIZE_MULTIPLIERS.medium.height;
const SPACING = BASE_SPACING * SIZE_MULTIPLIERS.medium.spacing;

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
  if (mode === 'grid') {
    return calculateGridLayout(tables, positions, zoomSpacingMultiplier);
  }
  if (mode === 'hierarchical') {
    return calculateHierarchicalLayout(tables, positions, model, zoomSpacingMultiplier);
  }
  if (mode === 'domain') {
    return calculateDomainLayout(tables, positions, model, zoomSpacingMultiplier);
  }
  return calculateForceLayout(model, positions);
}

function calculateGridLayout(
  tables: TableDef[],
  existingPositions: Record<string, TablePosition>,
  spacingMultiplier: number = 1.0
): Record<string, TablePosition> {
  const positions: Record<string, TablePosition> = {};
  
  // Calculate viewport width for horizontal distribution
  // Use a large default width to ensure good horizontal spread
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 2400;
  const availableWidth = Math.max(viewportWidth - 300, 2200); // Use more horizontal space
  const startX = 100; // Start closer to left edge
  const startY = 80;
  
  // Apply spacing multiplier for zoom-based spacing
  const adjustedSpacing = SPACING * spacingMultiplier;
  
  // Calculate optimal tables per row - maximize horizontal spread
  // Use more aggressive horizontal distribution
  const tablesPerRow = Math.floor(availableWidth / (TABLE_WIDTH + adjustedSpacing));
  const maxTablesPerRow = Math.max(tablesPerRow, 12); // Minimum 12 tables per row for better horizontal spread
  
  // Group by category for visual organization
  const byCategory = new Map<string, TableDef[]>();
  tables.forEach((table) => {
    if (!byCategory.has(table.category)) {
      byCategory.set(table.category, []);
    }
    byCategory.get(table.category)!.push(table);
  });

  let currentX = startX;
  let currentY = startY;
  let rowCount = 0;
  const categories = Array.from(byCategory.keys());

  // Arrange all tables horizontally, wrapping when needed
  categories.forEach((category, catIdx) => {
    const categoryTables = byCategory.get(category)!;
    
    // Sort by layer for consistent ordering
    categoryTables.sort((a, b) => {
      const layerOrder = { L1: 1, L2: 2, L3: 3 };
      return layerOrder[a.layer] - layerOrder[b.layer];
    });

    categoryTables.forEach((table) => {
      if (!existingPositions[table.key]) {
        positions[table.key] = { x: currentX, y: currentY };
      } else {
        positions[table.key] = existingPositions[table.key];
      }
      
      currentX += TABLE_WIDTH + adjustedSpacing;
      rowCount++;
      
      // Wrap to next row when we reach max tables per row
      if (rowCount >= maxTablesPerRow) {
        currentX = startX;
        currentY += TABLE_HEIGHT + adjustedSpacing * 0.8; // Tighter vertical spacing
        rowCount = 0;
      }
    });
    
    // Add minimal spacing between categories (keep horizontal flow)
    if (catIdx < categories.length - 1 && rowCount > 0) {
      currentX += adjustedSpacing * 1.5; // Extra horizontal spacing between categories
      if (currentX + TABLE_WIDTH > startX + availableWidth) {
        currentX = startX;
        currentY += TABLE_HEIGHT + adjustedSpacing * 0.5;
        rowCount = 0;
      }
    }
  });

  return positions;
}

function calculateHierarchicalLayout(
  tables: TableDef[],
  existingPositions: Record<string, TablePosition>,
  model?: DataModel,
  spacingMultiplier: number = 1.0
): Record<string, TablePosition> {
  const positions: Record<string, TablePosition> = {};
  
  // Calculate viewport width for horizontal distribution
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 2400;
  const availableWidth = Math.max(viewportWidth - 300, 2200);
  const adjustedSpacing = SPACING * spacingMultiplier;
  
  if (!model) {
    // Fallback to simple layer-based layout if no model provided
    // Spread layers horizontally with minimal vertical spacing
    const byLayer = { L1: [] as TableDef[], L2: [] as TableDef[], L3: [] as TableDef[] };
    tables.forEach((table) => {
      byLayer[table.layer].push(table);
    });
    
    // Reduce vertical spacing between layers for better horizontal flow
    const layerY = { L1: 100, L2: 420, L3: 740 }; // Tighter vertical spacing
    const startX = 100;
    let x = startX;
    
    (['L1', 'L2', 'L3'] as const).forEach((layer) => {
      byLayer[layer].forEach((table) => {
        if (!existingPositions[table.key]) {
          positions[table.key] = { x, y: layerY[layer] };
        } else {
          positions[table.key] = existingPositions[table.key];
        }
        x += TABLE_WIDTH + adjustedSpacing;
        
        // Wrap to next row if we exceed available width
        if (x + TABLE_WIDTH > startX + availableWidth) {
          x = startX;
        }
      });
      x = startX;
    });
    return positions;
  }

  // Build relationship graph
  const relationshipMap = new Map<string, Set<string>>(); // tableKey -> Set of connected tableKeys
  model.relationships.forEach((rel) => {
    if (!relationshipMap.has(rel.source.tableKey)) {
      relationshipMap.set(rel.source.tableKey, new Set());
    }
    if (!relationshipMap.has(rel.target.tableKey)) {
      relationshipMap.set(rel.target.tableKey, new Set());
    }
    relationshipMap.get(rel.source.tableKey)!.add(rel.target.tableKey);
    relationshipMap.get(rel.target.tableKey)!.add(rel.source.tableKey);
  });

  // Group tables by relationships (connected components)
  const visited = new Set<string>();
  const groups: TableDef[][] = [];
  
  tables.forEach((table) => {
    if (visited.has(table.key)) return;
    
    const group: TableDef[] = [];
    const queue = [table];
    visited.add(table.key);
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);
      
      const connected = relationshipMap.get(current.key) || new Set();
      connected.forEach((connectedKey) => {
        if (!visited.has(connectedKey)) {
          const connectedTable = tables.find(t => t.key === connectedKey);
          if (connectedTable) {
            visited.add(connectedKey);
            queue.push(connectedTable);
          }
        }
      });
    }
    
    groups.push(group);
  });

  // Sort groups by size (largest first) for better layout
  groups.sort((a, b) => b.length - a.length);

  // Position groups horizontally, with related tables grouped together
  const startX = 100;
  // Reduce vertical spacing between layers for better horizontal flow
  let layerY = { L1: 100, L2: 420, L3: 740 };
  const groupSpacing = 80 * spacingMultiplier; // Reduced spacing between groups
  let currentX = startX;
  const baseLayerY = { L1: 100, L2: 420, L3: 740 };
  let rowOffset = 0;

  groups.forEach((group) => {
    // Separate group by layers
    const byLayer = { L1: [] as TableDef[], L2: [] as TableDef[], L3: [] as TableDef[] };
    group.forEach((table) => {
      byLayer[table.layer].push(table);
    });

    // Position tables in this group
    let groupStartX = currentX;
    let maxGroupWidth = 0;

    (['L1', 'L2', 'L3'] as const).forEach((layer) => {
      const layerTables = byLayer[layer];
      if (layerTables.length === 0) return;

      let x = groupStartX;
      
      // Sort tables by number of relationships for better positioning
      layerTables.sort((a, b) => {
        const aConnections = (relationshipMap.get(a.key)?.size || 0);
        const bConnections = (relationshipMap.get(b.key)?.size || 0);
        return bConnections - aConnections; // More connected tables first
      });

      layerTables.forEach((table) => {
        if (!existingPositions[table.key]) {
          positions[table.key] = { x, y: baseLayerY[layer] + rowOffset };
        } else {
          positions[table.key] = existingPositions[table.key];
        }
        x += TABLE_WIDTH + adjustedSpacing;
        maxGroupWidth = Math.max(maxGroupWidth, x - groupStartX);
      });
    });

    // Move to next group position - spread horizontally
    currentX = groupStartX + maxGroupWidth + groupSpacing;
    
    // Wrap to next row if we exceed available width
    if (currentX + TABLE_WIDTH > startX + availableWidth) {
      currentX = startX;
      // Move to next row by increasing row offset
      rowOffset += TABLE_HEIGHT + adjustedSpacing * 1.5;
    }
  });

  // Handle tables with no relationships (orphans) - spread horizontally
  tables.forEach((table) => {
    if (!positions[table.key] && !existingPositions[table.key]) {
      positions[table.key] = { x: currentX, y: baseLayerY[table.layer] + rowOffset };
      currentX += TABLE_WIDTH + adjustedSpacing;
      
      // Wrap to next row if needed
      if (currentX + TABLE_WIDTH > startX + availableWidth) {
        currentX = startX;
        rowOffset += TABLE_HEIGHT + adjustedSpacing * 1.5;
      }
    }
  });

  return positions;
}

function calculateDomainLayout(
  tables: TableDef[],
  existingPositions: Record<string, TablePosition>,
  model?: DataModel,
  spacingMultiplier: number = 1.0
): Record<string, TablePosition> {
  const positions: Record<string, TablePosition> = {};
  
  if (!model) {
    // Fallback to grid if no model
    return calculateGridLayout(tables, existingPositions);
  }

  // Group tables by domain (category)
  const byDomain = new Map<string, TableDef[]>();
  tables.forEach((table) => {
    const domain = table.category || 'Uncategorized';
    if (!byDomain.has(domain)) {
      byDomain.set(domain, []);
    }
    byDomain.get(domain)!.push(table);
  });

  // Calculate viewport dimensions - MAXIMIZE horizontal spread
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 2400;
  const availableWidth = Math.max(viewportWidth - 200, 2600); // Use even more horizontal space
  const adjustedSpacing = SPACING * spacingMultiplier;
  
  // OPTIMIZED: Balance spacing for horizontal spread
  const domainSpacing = 50 * spacingMultiplier; // Reduced spacing to fit more domains horizontally
  const domainHeaderHeight = 80;
  const domainPadding = 25 * spacingMultiplier; // Reduced padding to maximize horizontal space
  const layerSpacing = 300 * spacingMultiplier; // Reduced vertical spacing to keep things horizontal
  
  const startX = 30; // Start closer to left edge
  const startY = 60; // Start higher up
  
  // Calculate optimal domain width based on number of domains and available width
  const domains = Array.from(byDomain.keys()).sort();
  const domainCount = domains.length;
  
  // PRIORITIZE HORIZONTAL: Fit as many domains as possible in one row
  // Use smaller minimum width to allow more domains horizontally
  const minDomainWidth = 350; // Reduced minimum width to fit more domains
  const maxDomainsPerRow = Math.floor((availableWidth - startX * 2) / (minDomainWidth + domainSpacing));
  
  // Target: Fit ALL domains in one row if possible, otherwise 10-15 per row
  const optimalDomainsPerRow = Math.min(Math.max(domainCount, 10), Math.max(maxDomainsPerRow, 15));
  
  // CRITICAL: Calculate domain width ensuring no overlap
  // Formula: (availableWidth - margins - spacing) / domainsPerRow
  const actualDomainsPerRow = Math.min(domainCount, optimalDomainsPerRow);
  const totalSpacing = (actualDomainsPerRow - 1) * domainSpacing;
  let domainContainerWidth = Math.floor((availableWidth - totalSpacing - startX * 2) / actualDomainsPerRow);
  
  // Ensure minimum width to prevent overlap
  domainContainerWidth = Math.max(domainContainerWidth, minDomainWidth);
  
  let currentX = startX;
  let currentY = startY;
  let maxYInRow = startY;
  let domainsInCurrentRow = 0;
  
  // Sort domains by size (largest first) for better layout
  domains.sort((a, b) => {
    const aSize = byDomain.get(a)!.length;
    const bSize = byDomain.get(b)!.length;
    return bSize - aSize;
  });

  domains.forEach((domain, domainIdx) => {
    const domainTables = byDomain.get(domain)!;
    
    // Separate tables by layer within domain
    const byLayer = { L1: [] as TableDef[], L2: [] as TableDef[], L3: [] as TableDef[] };
    domainTables.forEach((table) => {
      byLayer[table.layer].push(table);
    });

    // Calculate domain container dimensions
    const layerYOffsets = { 
      L1: domainHeaderHeight + domainPadding, 
      L2: domainHeaderHeight + domainPadding + layerSpacing, 
      L3: domainHeaderHeight + domainPadding + layerSpacing * 2 
    };
    
    // IMPROVED: Calculate max tables per layer to determine container height
    const maxTablesInLayer = Math.max(
      byLayer.L1.length,
      byLayer.L2.length,
      byLayer.L3.length
    );
    const layerWidth = domainContainerWidth - domainPadding * 2;
    
    // HORIZONTAL PRIORITY: Arrange tables horizontally within domains
    // Use domainContainerWidth to ensure consistent spacing
    const effectiveLayerWidth = domainContainerWidth - domainPadding * 2;
    
    // Calculate how many tables fit per row - prioritize horizontal arrangement
    const minTableSpacing = TABLE_WIDTH * 0.25; // 25% spacing - tighter for more horizontal tables
    const tablesPerRow = Math.max(1, Math.floor(effectiveLayerWidth / (TABLE_WIDTH + minTableSpacing)));
    const rowsNeeded = Math.ceil(maxTablesInLayer / tablesPerRow);
    
    // Calculate domain height - minimize vertical space to keep layout horizontal
    const rowSpacing = TABLE_HEIGHT + adjustedSpacing * 1.2; // Reduced spacing between rows
    const domainHeight = domainHeaderHeight + domainPadding * 2 + (rowsNeeded > 0 ? rowsNeeded * rowSpacing + layerSpacing * 2 : 200);
    
    // Position tables within domain container (relative to domain top-left)
    let domainStartX = currentX + domainPadding;
    
    (['L1', 'L2', 'L3'] as const).forEach((layer) => {
      const layerTables = byLayer[layer];
      if (layerTables.length === 0) return;
      
      // CRITICAL: Calculate spacing to prevent overlap
      let actualSpacing: number;
      let startX = domainStartX;
      
      if (layerTables.length === 1) {
        // Single table: center it
        actualSpacing = 0;
        startX = currentX + domainPadding + (effectiveLayerWidth - TABLE_WIDTH) / 2;
      } else if (layerTables.length <= tablesPerRow) {
        // All tables fit in one row: distribute evenly across full width
        const totalTableWidth = layerTables.length * TABLE_WIDTH;
        const availableSpace = effectiveLayerWidth - totalTableWidth;
        actualSpacing = availableSpace / (layerTables.length - 1);
        // Ensure minimum spacing to prevent overlap
        actualSpacing = Math.max(actualSpacing, minTableSpacing);
      } else {
        // Multiple rows: use minimum spacing to maximize horizontal spread
        actualSpacing = minTableSpacing;
      }
      
      let x = startX;
      let rowCount = 0;
      let currentRowY = currentY + layerYOffsets[layer];
      
      layerTables.forEach((table, idx) => {
        if (!existingPositions[table.key]) {
          positions[table.key] = { 
            x, 
            y: currentRowY
          };
        } else {
          positions[table.key] = existingPositions[table.key];
        }
        
        x += TABLE_WIDTH + actualSpacing;
        rowCount++;
        
        // Wrap to next row within layer if needed - ensure no overlap
        if (rowCount >= tablesPerRow && idx < layerTables.length - 1) {
          x = domainStartX;
          currentRowY += rowSpacing; // Use consistent row spacing
          rowCount = 0;
        }
      });
      
      // Reset domainStartX for next layer
      domainStartX = currentX + domainPadding;
    });
    
    // CRITICAL: Move to next domain position - ensure no horizontal overlap
    maxYInRow = Math.max(maxYInRow, currentY + domainHeight);
    currentX += domainContainerWidth + domainSpacing; // Use domainContainerWidth to ensure no overlap
    domainsInCurrentRow++;
    
    // Wrap to next row when we've filled the optimal number per row
    if (domainsInCurrentRow >= optimalDomainsPerRow && domainIdx < domains.length - 1) {
      currentX = startX;
      currentY = maxYInRow + domainSpacing * 2.5; // Extra spacing between rows for clarity
      maxYInRow = currentY;
      domainsInCurrentRow = 0;
    }
  });
  
  // IMPROVED: Center remaining domains in the last row for better visual balance
  // Use domainContainerWidth for consistency
  if (domainsInCurrentRow > 0 && domainsInCurrentRow < optimalDomainsPerRow) {
    const usedWidth = domainsInCurrentRow * domainContainerWidth + (domainsInCurrentRow - 1) * domainSpacing;
    const remainingWidth = availableWidth - usedWidth - startX * 2;
    const extraSpacing = remainingWidth / (domainsInCurrentRow + 1);
    
    // Adjust positions of domains in the last row to center them
    let adjustX = startX + extraSpacing;
    const lastRowDomains = domains.slice(-domainsInCurrentRow);
    lastRowDomains.forEach((domain) => {
      const domainTables = byDomain.get(domain)!;
      const domainIndex = lastRowDomains.indexOf(domain);
      const originalX = startX + (domainIndex * (domainContainerWidth + domainSpacing));
      const offset = adjustX - originalX;
      domainTables.forEach((table) => {
        if (positions[table.key]) {
          positions[table.key].x += offset;
        }
      });
      adjustX += domainContainerWidth + domainSpacing;
    });
  }

  return positions;
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
    return calculateGridLayout(tables, existingPositions);
  }

  const { width: OVERVIEW_TABLE_WIDTH, height: OVERVIEW_TABLE_HEIGHT } = compactView
    ? getCompactOverviewTableDimensions()
    : getOverviewTableDimensions(tableSize);
  const TABLE_SPACING = compactView ? 4 : 6;
  const DOMAIN_SPACING = compactView ? 4 : 6;
  const DOMAIN_PADDING = compactView ? 6 : 10;
  const DOMAIN_HEADER_HEIGHT = compactView ? 26 : 36;
  const LAYER_GAP = compactView ? 6 : 8;

  // Group tables by domain
  const byDomain = new Map<string, TableDef[]>();
  tables.forEach((table) => {
    const domain = table.category || 'Uncategorized';
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain)!.push(table);
  });

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 2400;
  const startX = 6;
  const startY = 8;
  // Use a minimum width so 5 groups per row are each wider
  const availableWidth = Math.max(viewportWidth - 12, 3200);

  let domains = Array.from(byDomain.keys());

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
  const maxDomainWidth = availableWidth - startX * 2;

  // Per-domain: width from content (so category boxes size to their tables), height from content
  const domainHeights = new Map<string, number>();
  const domainWidths = new Map<string, number>();

  domains.forEach((domain) => {
    const domainTables = byDomain.get(domain)!;
    const byLayer = { L1: [] as TableDef[], L2: [] as TableDef[], L3: [] as TableDef[] };
    domainTables.forEach(t => byLayer[t.layer].push(t));
    const maxTablesInLayer = Math.max(byLayer.L1.length, byLayer.L2.length, byLayer.L3.length);
    const tablesPerRow = Math.min(maxTablesInLayer, maxTablesPerRow);
    const contentWidth = tablesPerRow * (OVERVIEW_TABLE_WIDTH + TABLE_SPACING) - TABLE_SPACING;
    const minDomainWidth = OVERVIEW_TABLE_WIDTH + DOMAIN_PADDING * 2;
    const domainWidth = Math.max(minDomainWidth, Math.min(contentWidth + DOMAIN_PADDING * 2, maxDomainWidth));
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

function calculateForceLayout(
  model: DataModel,
  existingPositions: Record<string, TablePosition>
): Record<string, TablePosition> {
  const positions: Record<string, TablePosition> = {};
  const tables = Object.values(model.tables);
  
  // Simple force simulation - start with grid, then apply forces
  const initialPositions = calculateGridLayout(tables, {});
  
  tables.forEach((table) => {
    if (existingPositions[table.key]) {
      positions[table.key] = existingPositions[table.key];
    } else {
      positions[table.key] = initialPositions[table.key] || { x: 100, y: 100 };
    }
  });

  // Simple force iteration
  for (let iter = 0; iter < 50; iter++) {
    const newPositions: Record<string, TablePosition> = { ...positions };
    
    tables.forEach((table) => {
      if (existingPositions[table.key]) {
        return; // Don't move manually positioned tables
      }

      let fx = 0;
      let fy = 0;

      // Repel from other tables
      tables.forEach((other) => {
        if (table.key === other.key) return;
        const dx = positions[table.key].x - positions[other.key].x;
        const dy = positions[table.key].y - positions[other.key].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 1000 / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      });

      // Attract to connected tables
      model.relationships.forEach((rel) => {
        if (rel.source.tableKey === table.key) {
          const target = positions[rel.target.tableKey];
          if (target) {
            const dx = target.x - positions[table.key].x;
            const dy = target.y - positions[table.key].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            fx += (dx / dist) * 0.5;
            fy += (dy / dist) * 0.5;
          }
        }
      });

      newPositions[table.key] = {
        x: Math.max(0, positions[table.key].x + fx * 0.1),
        y: Math.max(0, positions[table.key].y + fy * 0.1),
      };
    });

    Object.assign(positions, newPositions);
  }

  return positions;
}
