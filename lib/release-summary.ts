import type { ReleaseEntry } from './release-tracker-data';

// ── Types ──────────────────────────────────────────────────

export interface ReleaseSummary {
  date: string;
  narrative: string;
  bullets: SummaryBullet[];
  stats: ReleaseSummaryStats;
  entries: ReleaseEntry[];
}

export interface SummaryBullet {
  category: string;
  text: string;
  changeType: 'Added' | 'Removed' | 'Moved' | 'Mixed';
}

export interface ReleaseSummaryStats {
  totalChanges: number;
  tablesAdded: number;
  tablesRemoved: number;
  fieldsAdded: number;
  fieldsRemoved: number;
  fieldsMoved: number;
  byLayer: Record<'L1' | 'L2' | 'L3', number>;
}

// ── Helpers ────────────────────────────────────────────────

interface FieldEntry {
  idx: number;
  layer: string;
  table: string;
  field: string;
  changeType: string;
  rationale: string;
}

function plural(word: string, n: number): string {
  return n === 1 ? word : word + 's';
}

function listNames(names: string[], max = 3): string {
  if (names.length <= max) return names.join(', ');
  return names.slice(0, max).join(', ') + ` and ${names.length - max} more`;
}

// ── Stats ──────────────────────────────────────────────────

function computeStats(entries: ReleaseEntry[]): ReleaseSummaryStats {
  const byLayer: Record<'L1' | 'L2' | 'L3', number> = { L1: 0, L2: 0, L3: 0 };
  let tablesAdded = 0, tablesRemoved = 0;
  let fieldsAdded = 0, fieldsRemoved = 0, fieldsMoved = 0;

  for (const e of entries) {
    byLayer[e.layer]++;
    const isTable = e.field === '(entire table)' || e.field === '(new table)' || e.field === '(entire layer)';
    if (isTable) {
      if (e.changeType === 'Added') tablesAdded++;
      else if (e.changeType === 'Removed') tablesRemoved++;
    } else {
      if (e.changeType === 'Added') fieldsAdded++;
      else if (e.changeType === 'Removed') fieldsRemoved++;
      else if (e.changeType === 'Moved') fieldsMoved++;
    }
  }

  return {
    totalChanges: entries.length,
    tablesAdded, tablesRemoved,
    fieldsAdded, fieldsRemoved, fieldsMoved,
    byLayer,
  };
}

// ── Theme Detectors ────────────────────────────────────────

/**
 * Detect L1 tables that were removed then re-added in L2 (layer migration).
 * Pattern: L1 table removed + L2 table with same name added on same date.
 */
function detectTableMigrations(
  tablesRemoved: Map<string, string>,   // tableName → layer
  tablesAdded: Map<string, { layer: string; fieldCount: number }>,
  claimed: Set<string>,
): SummaryBullet[] {
  const migrations: { table: string; from: string; to: string }[] = [];

  for (const [name, fromLayer] of tablesRemoved) {
    const added = tablesAdded.get(name);
    if (added && added.layer !== fromLayer) {
      migrations.push({ table: name, from: fromLayer, to: added.layer });
      claimed.add(`table-removed:${name}`);
      claimed.add(`table-added:${name}`);
    }
  }

  if (migrations.length === 0) return [];

  // Group by direction
  const byDir = new Map<string, string[]>();
  for (const m of migrations) {
    const dir = `${m.from} to ${m.to}`;
    const arr = byDir.get(dir) ?? [];
    arr.push(m.table);
    byDir.set(dir, arr);
  }

  return [...byDir.entries()].map(([dir, tables]) => ({
    category: 'Layer Migration',
    text: `Moved ${tables.length} ${plural('table', tables.length)} from ${dir}: ${listNames(tables, 4)}`,
    changeType: 'Moved' as const,
  }));
}

/**
 * Detect surrogate key additions (_sk suffix) across L3 tables.
 */
function detectSurrogateKeys(
  fields: FieldEntry[],
  claimed: Set<number>,
): SummaryBullet[] {
  const skFields = fields.filter((f, i) =>
    !claimed.has(i) && f.field.endsWith('_sk') && f.changeType === 'Added'
  );
  if (skFields.length < 3) return [];

  const tables = [...new Set(skFields.map(f => f.table))];
  for (const f of skFields) claimed.add(f.idx);

  return [{
    category: 'Infrastructure',
    text: `Added surrogate keys to ${tables.length} L3 ${plural('table', tables.length)}`,
    changeType: 'Added',
  }];
}

/**
 * Detect naming standardization: paired add/remove on same table
 * where field names differ by _flag or _code suffix.
 */
function detectNamingStandardization(
  added: FieldEntry[],
  removed: FieldEntry[],
  claimedIdx: Set<number>,
): SummaryBullet[] {
  const pairs: { old: string; new_: string; table: string }[] = [];

  for (const rem of removed) {
    if (claimedIdx.has(rem.idx)) continue;
    for (const add of added) {
      if (claimedIdx.has(add.idx)) continue;
      if (rem.table !== add.table || rem.layer !== add.layer) continue;

      if (isRenamePair(rem.field, add.field)) {
        pairs.push({ old: rem.field, new_: add.field, table: rem.table });
        claimedIdx.add(rem.idx);
        claimedIdx.add(add.idx);
        break;
      }
    }
  }

  if (pairs.length < 2) return [];

  // Group by rename pattern
  const flagPairs = pairs.filter(p => p.new_.endsWith('_flag') || p.old.endsWith('_flag'));
  const codePairs = pairs.filter(p => !flagPairs.includes(p));

  const bullets: SummaryBullet[] = [];
  if (flagPairs.length > 0) {
    const tables = [...new Set(flagPairs.map(p => p.table))];
    bullets.push({
      category: 'Naming Standardization',
      text: `Standardized ${flagPairs.length} boolean ${plural('field', flagPairs.length)} to _flag suffix across ${tables.length} ${plural('table', tables.length)}`,
      changeType: 'Mixed',
    });
  }
  if (codePairs.length > 0) {
    const tables = [...new Set(codePairs.map(p => p.table))];
    bullets.push({
      category: 'Naming Standardization',
      text: `Renamed ${codePairs.length} ${plural('field', codePairs.length)} to standard suffixes across ${tables.length} ${plural('table', tables.length)}`,
      changeType: 'Mixed',
    });
  }
  return bullets;
}

function isRenamePair(oldName: string, newName: string): boolean {
  // is_active → is_active_flag
  if (newName === oldName + '_flag') return true;
  if (oldName === newName + '_flag') return true;
  // pricing_tier → pricing_tier_code
  if (newName === oldName + '_code') return true;
  if (oldName === newName + '_code') return true;
  // Swap suffix: _flag → _code
  const oldBase = oldName.replace(/_(flag|code)$/, '');
  const newBase = newName.replace(/_(flag|code)$/, '');
  if (oldBase === newBase && oldBase !== oldName && newBase !== newName) return true;
  return false;
}

/**
 * Detect field-level migrations: same field name removed from one layer, added to another.
 */
function detectFieldMigrations(
  added: FieldEntry[],
  removed: FieldEntry[],
  claimedIdx: Set<number>,
): SummaryBullet[] {
  const migrations: { field: string; from: string; to: string }[] = [];

  for (const rem of removed) {
    if (claimedIdx.has(rem.idx)) continue;
    for (const add of added) {
      if (claimedIdx.has(add.idx)) continue;
      // Must be same field name across different layers
      if (rem.field === add.field && rem.layer !== add.layer) {
        migrations.push({ field: rem.field, from: rem.layer, to: add.layer });
        claimedIdx.add(rem.idx);
        claimedIdx.add(add.idx);
        break;
      }
    }
  }

  // Also check rationale for migration keywords
  for (const rem of removed) {
    if (claimedIdx.has(rem.idx)) continue;
    const r = rem.rationale;
    if (/was atomic.*moved to/i.test(r)) {
      // Extract target layer from rationale
      const targetMatch = r.match(/moved to (L[123])/i);
      const to = targetMatch ? targetMatch[1] : 'L2';
      if (to !== rem.layer) {
        migrations.push({ field: rem.field, from: rem.layer, to });
        claimedIdx.add(rem.idx);
      }
    } else if (/reverted from L[123].*back to (L[123])/i.test(r)) {
      const targetMatch = r.match(/back to (L[123])/i);
      const to = targetMatch ? targetMatch[1] : 'L2';
      if (to !== rem.layer) {
        migrations.push({ field: rem.field, from: rem.layer, to });
        claimedIdx.add(rem.idx);
      }
    }
  }

  if (migrations.length === 0) return [];

  // Group by direction
  const byDir = new Map<string, string[]>();
  for (const m of migrations) {
    const dir = `${m.from} to ${m.to}`;
    const arr = byDir.get(dir) ?? [];
    arr.push(m.field);
    byDir.set(dir, arr);
  }

  return [...byDir.entries()].map(([dir, fields]) => ({
    category: 'Field Migration',
    text: `Migrated ${fields.length} ${plural('field', fields.length)} from ${dir}: ${listNames(fields, 4)}`,
    changeType: 'Moved' as const,
  }));
}

/**
 * Detect GL/accounting-related changes.
 */
function detectGLChanges(
  entries: ReleaseEntry[],
  claimedIdx: Set<number>,
  claimedTables: Set<string>,
): SummaryBullet[] {
  const glEntries = entries.filter((e, i) => {
    if (claimedIdx.has(i) || claimedTables.has(`table-${e.changeType.toLowerCase()}d:${e.table}`)) return false;
    return /^gl_|ledger|journal/.test(e.table);
  });

  if (glEntries.length === 0) return [];

  const addedTables = [...new Set(glEntries.filter(e => e.field === '(new table)').map(e => e.table))];
  const removedTables = [...new Set(glEntries.filter(e => e.field === '(entire table)' && e.changeType === 'Removed').map(e => e.table))];

  // Claim all GL entries
  for (const e of glEntries) {
    const idx = entries.indexOf(e);
    if (idx >= 0) claimedIdx.add(idx);
  }

  const bullets: SummaryBullet[] = [];
  if (removedTables.length > 0) {
    bullets.push({
      category: 'GL Accounting',
      text: `Removed ${removedTables.length} GL ${plural('table', removedTables.length)}: ${listNames(removedTables)}`,
      changeType: 'Removed',
    });
  }
  if (addedTables.length > 0) {
    bullets.push({
      category: 'GL Accounting',
      text: `Added ${addedTables.length} GL ${plural('table', addedTables.length)}: ${listNames(addedTables)}`,
      changeType: 'Added',
    });
  }
  // Also check for individual field changes on non-table-level GL entries
  const addedGlFields = glEntries.filter(e => e.changeType === 'Added' && e.field !== '(new table)' && !addedTables.includes(e.table));
  if (addedGlFields.length > 0) {
    const tables = [...new Set(addedGlFields.map(e => `${e.layer}.${e.table}`))];
    bullets.push({
      category: 'GL Accounting',
      text: `Added ${addedGlFields.length} ${plural('field', addedGlFields.length)} to ${listNames(tables)}`,
      changeType: 'Added',
    });
  }
  if (bullets.length === 0) {
    const removedGlFields = glEntries.filter(e => e.changeType === 'Removed' && e.field !== '(entire table)');
    if (removedGlFields.length > 0) {
      bullets.push({
        category: 'GL Accounting',
        text: `Removed ${removedGlFields.length} GL accounting ${plural('field', removedGlFields.length)}`,
        changeType: 'Removed',
      });
    }
  }
  return bullets;
}

/**
 * Group remaining unclaimed table-level operations.
 */
function groupTableOperations(
  entries: ReleaseEntry[],
  claimedIdx: Set<number>,
  claimedTables: Set<string>,
): SummaryBullet[] {
  const bullets: SummaryBullet[] = [];

  // New tables
  const newTables = new Map<string, { layer: string; fieldCount: number }>();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (claimedIdx.has(i) || claimedTables.has(`table-added:${e.table}`)) continue;
    if (e.field === '(new table)' && e.changeType === 'Added') {
      // Count fields for this table
      const fieldCount = entries.filter(f => f.table === e.table && f.field !== '(new table)' && f.date === e.date).length;
      newTables.set(e.table, { layer: e.layer, fieldCount });
      claimedIdx.add(i);
    }
  }

  // Group new tables by layer
  const newByLayer = new Map<string, { table: string; fieldCount: number }[]>();
  for (const [table, info] of newTables) {
    const arr = newByLayer.get(info.layer) ?? [];
    arr.push({ table, fieldCount: info.fieldCount });
    newByLayer.set(info.layer, arr);
    // Claim all fields of new tables
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].table === table && entries[i].field !== '(new table)') {
        claimedIdx.add(i);
      }
    }
  }

  for (const [layer, tables] of newByLayer) {
    if (tables.length === 1) {
      const t = tables[0];
      bullets.push({
        category: 'New Tables',
        text: `Added ${layer}.${t.table} (${t.fieldCount} ${plural('field', t.fieldCount)})`,
        changeType: 'Added',
      });
    } else {
      const totalFields = tables.reduce((s, t) => s + t.fieldCount, 0);
      bullets.push({
        category: 'New Tables',
        text: `Added ${tables.length} new ${layer} ${plural('table', tables.length)}: ${listNames(tables.map(t => t.table), 4)} (${totalFields} fields total)`,
        changeType: 'Added',
      });
    }
  }

  // Removed tables
  const removedTables = new Map<string, string>(); // table → layer
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (claimedIdx.has(i) || claimedTables.has(`table-removed:${e.table}`)) continue;
    if (e.field === '(entire table)' && e.changeType === 'Removed') {
      removedTables.set(e.table, e.layer);
      claimedIdx.add(i);
    }
  }

  const removedByLayer = new Map<string, string[]>();
  for (const [table, layer] of removedTables) {
    const arr = removedByLayer.get(layer) ?? [];
    arr.push(table);
    removedByLayer.set(layer, arr);
  }

  for (const [layer, tables] of removedByLayer) {
    bullets.push({
      category: 'Table Removal',
      text: `Removed ${tables.length} ${layer} ${plural('table', tables.length)}: ${listNames(tables, 4)}`,
      changeType: 'Removed',
    });
  }

  return bullets;
}

/**
 * Group remaining unclaimed field-level changes by table.
 */
function groupRemainingFields(
  entries: ReleaseEntry[],
  claimedIdx: Set<number>,
): SummaryBullet[] {
  const bullets: SummaryBullet[] = [];

  // Group unclaimed entries by (layer.table, changeType)
  const groups = new Map<string, { layer: string; table: string; fields: string[]; changeType: string }>();

  for (let i = 0; i < entries.length; i++) {
    if (claimedIdx.has(i)) continue;
    const e = entries[i];
    if (e.field === '(entire table)' || e.field === '(new table)' || e.field === '(entire layer)') continue;

    const key = `${e.layer}.${e.table}:${e.changeType}`;
    const group = groups.get(key) ?? { layer: e.layer, table: e.table, fields: [], changeType: e.changeType };
    group.fields.push(e.field);
    groups.set(key, group);
    claimedIdx.add(i);
  }

  // Sort by field count desc so biggest groups appear first
  const sorted = [...groups.values()].sort((a, b) => b.fields.length - a.fields.length);

  // Collapse into manageable bullets — show top tables, summarize rest
  const MAX_BULLETS = 4;
  const shown = sorted.slice(0, MAX_BULLETS);
  const rest = sorted.slice(MAX_BULLETS);

  for (const g of shown) {
    const verb = g.changeType === 'Added' ? 'Added' : g.changeType === 'Removed' ? 'Removed' : 'Moved';
    bullets.push({
      category: verb === 'Added' ? 'Field Additions' : verb === 'Removed' ? 'Field Removals' : 'Field Changes',
      text: `${verb} ${g.fields.length} ${plural('field', g.fields.length)} ${verb === 'Removed' ? 'from' : verb === 'Added' ? 'to' : 'in'} ${g.layer}.${g.table}: ${listNames(g.fields, 4)}`,
      changeType: g.changeType as 'Added' | 'Removed' | 'Moved',
    });
  }

  if (rest.length > 0) {
    const totalFields = rest.reduce((s, g) => s + g.fields.length, 0);
    const addedCount = rest.filter(g => g.changeType === 'Added').reduce((s, g) => s + g.fields.length, 0);
    const removedCount = rest.filter(g => g.changeType === 'Removed').reduce((s, g) => s + g.fields.length, 0);

    const parts: string[] = [];
    if (addedCount > 0) parts.push(`${addedCount} added`);
    if (removedCount > 0) parts.push(`${removedCount} removed`);
    const movedCount = totalFields - addedCount - removedCount;
    if (movedCount > 0) parts.push(`${movedCount} moved`);

    bullets.push({
      category: 'Other Changes',
      text: `${totalFields} more field changes across ${rest.length} ${plural('table', rest.length)} (${parts.join(', ')})`,
      changeType: 'Mixed',
    });
  }

  return bullets;
}

// ── Foundation Detection ───────────────────────────────────

function detectFoundation(entries: ReleaseEntry[]): SummaryBullet[] {
  const layerEntries = entries.filter(e => e.field === '(entire layer)');
  if (layerEntries.length === 0) return [];

  return layerEntries.map(e => ({
    category: 'Foundation',
    text: `${e.layer} layer established: ${e.rationale}`,
    changeType: 'Added' as const,
  }));
}

// ── Rollup Propagation Detection ───────────────────────────

function detectRollupPropagation(
  added: FieldEntry[],
  claimedIdx: Set<number>,
): SummaryBullet[] {
  const summaryTables = ['desk_summary', 'lob_l1_summary', 'lob_l2_summary', 'lob_exposure_summary',
    'facility_derived', 'counterparty_derived', 'desk_derived', 'portfolio_derived', 'segment_derived'];

  // Find fields added to multiple summary tables
  const fieldToTables = new Map<string, FieldEntry[]>();
  for (const f of added) {
    if (claimedIdx.has(f.idx)) continue;
    if (!summaryTables.includes(f.table)) continue;
    const arr = fieldToTables.get(f.field) ?? [];
    arr.push(f);
    fieldToTables.set(f.field, arr);
  }

  const propagated: { field: string; tables: string[] }[] = [];
  for (const [field, entries] of fieldToTables) {
    if (entries.length >= 2) {
      propagated.push({ field, tables: entries.map(e => e.table) });
      for (const e of entries) claimedIdx.add(e.idx);
    }
  }

  if (propagated.length < 2) return [];

  const fieldNames = propagated.map(p => p.field);
  const tableCount = [...new Set(propagated.flatMap(p => p.tables))].length;

  return [{
    category: 'Rollup Propagation',
    text: `Propagated ${fieldNames.length} ${plural('field', fieldNames.length)} across ${tableCount} rollup ${plural('table', tableCount)}: ${listNames(fieldNames, 4)}`,
    changeType: 'Added',
  }];
}

// ── Narrative Generation ───────────────────────────────────

function generateNarrative(bullets: SummaryBullet[], stats: ReleaseSummaryStats): string {
  if (stats.totalChanges <= 3) {
    // Very small day — just describe directly
    const parts: string[] = [];
    for (const b of bullets) parts.push(b.text);
    return parts.join('. ') + '.';
  }

  const categories = new Set(bullets.map(b => b.category));
  const sentences: string[] = [];

  // Lead sentence — what was the dominant activity?
  if (categories.has('Foundation')) {
    sentences.push(`Foundation data model established with ${stats.totalChanges} elements across ${Object.entries(stats.byLayer).filter(([, v]) => v > 0).length} layers`);
  } else if (categories.has('Layer Migration') && stats.tablesRemoved >= 5) {
    const migBullet = bullets.find(b => b.category === 'Layer Migration');
    sentences.push(migBullet ? `Major schema restructuring — ${migBullet.text.toLowerCase()}` : `Major schema restructuring across all layers`);
  } else if (categories.has('Field Migration') && !categories.has('Layer Migration')) {
    const migBullet = bullets.find(b => b.category === 'Field Migration');
    sentences.push(`Layer convention enforcement — ${migBullet?.text.toLowerCase() ?? 'migrated atomic fields from L3 to L2'}`);
  } else if (stats.tablesRemoved >= 3 && stats.tablesAdded < stats.tablesRemoved) {
    sentences.push(`Schema simplification — removed ${stats.tablesRemoved} ${plural('table', stats.tablesRemoved)} across ${Object.entries(stats.byLayer).filter(([, v]) => v > 0).map(([k]) => k).join('/')}`);
  } else if (stats.tablesAdded >= 3) {
    sentences.push(`Schema expansion — added ${stats.tablesAdded} new ${plural('table', stats.tablesAdded)} with ${stats.fieldsAdded} fields`);
  } else if (categories.has('Naming Standardization') && bullets.filter(b => b.category === 'Naming Standardization').length > 0) {
    const stdBullet = bullets.find(b => b.category === 'Naming Standardization');
    sentences.push(stdBullet?.text ?? 'Naming standardization pass');
  } else {
    const layers = Object.entries(stats.byLayer).filter(([, v]) => v > 0).map(([k]) => k);
    sentences.push(`${stats.totalChanges} changes across ${layers.join('/')} layers`);
  }

  // Secondary sentence — pick the most notable remaining theme (different category from lead)
  const leadCategories = new Set<string>();
  for (const b of bullets) {
    if (sentences[0]?.toLowerCase().includes(b.text.toLowerCase().substring(0, 20))) {
      leadCategories.add(b.category);
    }
  }
  // Also mark the category of the bullet that was used in the lead sentence
  const leadBullet = bullets.find(b => sentences[0]?.toLowerCase().includes(b.text.substring(0, 20).toLowerCase()));
  if (leadBullet) leadCategories.add(leadBullet.category);

  const secondary = bullets.find(b =>
    !leadCategories.has(b.category) &&
    b.category !== 'Other Changes' &&
    b.category !== 'Foundation'
  );
  if (secondary) {
    sentences.push(secondary.text);
  }

  // Impact sentence from keywords in bullet text
  const allText = bullets.map(b => b.text).join(' ').toLowerCase();
  if (/dscr|ltv|ead|expected.loss|coverage.ratio/.test(allText)) {
    sentences.push('Enables enhanced credit risk metric calculations');
  } else if (/rwa|capital|basel/.test(allText)) {
    sentences.push('Supports regulatory capital and RWA reporting');
  } else if (/delinquency|dpd|overdue|aging/.test(allText)) {
    sentences.push('Enables delinquency monitoring and aging analysis');
  } else if (/syndication|lender|bank.share/.test(allText)) {
    sentences.push('Supports syndicated lending analysis');
  }

  return sentences.slice(0, 3).join('. ') + '.';
}

// ── Main Entry Point ───────────────────────────────────────

export function generateSummaries(entries: ReleaseEntry[]): ReleaseSummary[] {
  // Group by date
  const byDate = new Map<string, ReleaseEntry[]>();
  for (const e of entries) {
    const group = byDate.get(e.date) ?? [];
    group.push(e);
    byDate.set(e.date, group);
  }

  // Sort dates descending
  const sortedDates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  return sortedDates.map(date => {
    const dayEntries = byDate.get(date)!;
    const stats = computeStats(dayEntries);
    const bullets = generateBullets(dayEntries);
    const narrative = generateNarrative(bullets, stats);
    return { date, narrative, bullets, stats, entries: dayEntries };
  });
}

function generateBullets(entries: ReleaseEntry[]): SummaryBullet[] {
  const bullets: SummaryBullet[] = [];
  const claimedIdx = new Set<number>();
  const claimedTables = new Set<string>();

  // Check for foundation entries first
  const foundation = detectFoundation(entries);
  if (foundation.length > 0) {
    bullets.push(...foundation);
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].field === '(entire layer)') claimedIdx.add(i);
    }
  }

  // Build field arrays with indices for claiming
  const fieldEntries: FieldEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.field !== '(entire table)' && e.field !== '(new table)' && e.field !== '(entire layer)') {
      fieldEntries.push({ idx: i, layer: e.layer, table: e.table, field: e.field, changeType: e.changeType, rationale: e.rationale });
    }
  }

  const addedFields = fieldEntries.filter(f => f.changeType === 'Added');
  const removedFields = fieldEntries.filter(f => f.changeType === 'Removed');

  // Build table-level maps
  const tablesAdded = new Map<string, { layer: string; fieldCount: number }>();
  const tablesRemoved = new Map<string, string>();
  for (const e of entries) {
    if (e.field === '(new table)' && e.changeType === 'Added') {
      const fieldCount = entries.filter(f => f.table === e.table && f.field !== '(new table)' && f.date === e.date).length;
      tablesAdded.set(e.table, { layer: e.layer, fieldCount });
    }
    if (e.field === '(entire table)' && e.changeType === 'Removed') {
      tablesRemoved.set(e.table, e.layer);
    }
  }

  // 1. Table migrations (L1 → L2)
  const tableMigrations = detectTableMigrations(tablesRemoved, tablesAdded, claimedTables);
  bullets.push(...tableMigrations);

  // 2. Field migrations (L3 → L2)
  const fieldMigrations = detectFieldMigrations(addedFields, removedFields, claimedIdx);
  bullets.push(...fieldMigrations);

  // 3. Naming standardization
  const naming = detectNamingStandardization(addedFields, removedFields, claimedIdx);
  bullets.push(...naming);

  // 4. Surrogate keys
  const sk = detectSurrogateKeys(fieldEntries, claimedIdx);
  bullets.push(...sk);

  // 5. GL/Accounting
  const gl = detectGLChanges(entries, claimedIdx, claimedTables);
  bullets.push(...gl);

  // 6. Rollup propagation
  const rollup = detectRollupPropagation(addedFields, claimedIdx);
  bullets.push(...rollup);

  // 7. Table-level operations (new tables, removed tables)
  const tableOps = groupTableOperations(entries, claimedIdx, claimedTables);
  bullets.push(...tableOps);

  // 8. Remaining field changes
  const remaining = groupRemainingFields(entries, claimedIdx);
  bullets.push(...remaining);

  return bullets;
}
