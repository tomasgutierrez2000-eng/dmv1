import { NextRequest, NextResponse } from 'next/server';
import {
  LIBRARY_SHEET_NAMES,
  REQUIRED_COLUMNS,
  findLibraryColumnIndex,
  getCell,
  parseCommaList,
} from '@/lib/metric-library/excel-template';
import {
  getDomains,
  saveDomains,
  getParentMetric,
  upsertParentMetric,
  getVariant,
  saveVariant,
  addVariant,
} from '@/lib/metric-library/store';
import type { MetricDomain, ParentMetric, MetricVariant } from '@/lib/metric-library/types';

const METRIC_CLASSES = ['SOURCED', 'CALCULATED', 'HYBRID'] as const;
const UNIT_TYPES = ['RATIO', 'PERCENTAGE', 'CURRENCY', 'COUNT', 'RATE', 'ORDINAL', 'DAYS', 'INDEX'] as const;
const DIRECTIONS = ['HIGHER_BETTER', 'LOWER_BETTER', 'NEUTRAL'] as const;
const VARIANT_TYPES = ['SOURCED', 'CALCULATED'] as const;
const VARIANT_STATUSES = ['ACTIVE', 'DRAFT', 'DEPRECATED'] as const;
const WEIGHTING_BASIS = ['BY_EAD', 'BY_OUTSTANDING', 'BY_COMMITTED'] as const;

function pickEnum<T extends string>(value: string, allowed: readonly T[], defaultVal: T): T {
  const v = value.toUpperCase().replace(/\s/g, '_');
  if (allowed.includes(v as T)) return v as T;
  return defaultVal;
}

type XlsxUtils = { utils: { sheet_to_json: (sheet: unknown, opts?: { header?: number; defval?: null }) => unknown[] } };

function getSheet(
  wb: { SheetNames: string[]; Sheets: Record<string, unknown> },
  name: string,
  xlsxModule: XlsxUtils
): unknown[] | null {
  const exact = wb.SheetNames.find((s) => s === name);
  const sheetName = exact ?? wb.SheetNames.find((s) => s.toLowerCase() === name.toLowerCase());
  if (!sheetName) return null;
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return null;
  const json = xlsxModule.utils.sheet_to_json(sheet, { header: 1, defval: null });
  return Array.isArray(json) ? (json as unknown[]) : null;
}

export interface ImportResult {
  success: boolean;
  created: { domains: string[]; parents: string[]; variants: string[] };
  updated: { domains: string[]; parents: string[]; variants: string[] };
  errors: { row?: number; sheet?: string; message: string }[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided. Use form field "file".' }, { status: 400 });
    }

    const name = (file.name ?? '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      return NextResponse.json({ error: 'File must be .xlsx or .xls' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const xlsxModule = await import('xlsx');
    const XLSX = xlsxModule.default ?? xlsxModule;
    const wb = (XLSX as { read: (buf: Buffer, opts: { type: 'buffer' }) => { SheetNames: string[]; Sheets: Record<string, unknown> } }).read(buffer, { type: 'buffer' });
    const xlsxForSheet = XLSX as unknown as XlsxUtils;

    const hasDomains = getSheet(wb, LIBRARY_SHEET_NAMES.DOMAINS, xlsxForSheet) !== null;
    const hasParents = getSheet(wb, LIBRARY_SHEET_NAMES.PARENT_METRICS, xlsxForSheet) !== null;
    const hasVariants = getSheet(wb, LIBRARY_SHEET_NAMES.VARIANTS, xlsxForSheet) !== null;
    if (!hasDomains && !hasParents && !hasVariants) {
      return NextResponse.json({ error: 'Workbook must contain Domains, ParentMetrics, or Variants sheet.' }, { status: 400 });
    }

    const errors: ImportResult['errors'] = [];
    const created = { domains: [] as string[], parents: [] as string[], variants: [] as string[] };
    const updated = { domains: [] as string[], parents: [] as string[], variants: [] as string[] };
    const parentIdsFromFile = new Set<string>();

    // --- Domains ---
    const domainsData = getSheet(wb, LIBRARY_SHEET_NAMES.DOMAINS, xlsxForSheet);
    if (domainsData && domainsData.length >= 2) {
      const headers = (domainsData[0] as unknown[]).map((h) => String(h ?? '').trim());
      const missing = REQUIRED_COLUMNS.Domains.filter((k) => findLibraryColumnIndex(headers, [k]) < 0);
      if (missing.length > 0) {
        errors.push({ sheet: LIBRARY_SHEET_NAMES.DOMAINS, message: `Missing columns: ${missing.join(', ')}` });
      } else {
        const idxId = findLibraryColumnIndex(headers, ['domain_id']);
        const idxName = findLibraryColumnIndex(headers, ['domain_name']);
        const idxDesc = findLibraryColumnIndex(headers, ['domain_description']);
        const idxIcon = findLibraryColumnIndex(headers, ['icon']);
        const idxColor = findLibraryColumnIndex(headers, ['color']);
        const idxReg = findLibraryColumnIndex(headers, ['regulatory_relevance']);
        const idxStake = findLibraryColumnIndex(headers, ['primary_stakeholders']);

        const existingDomains = getDomains();
        const byId = new Map<string, MetricDomain>(existingDomains.map((d) => [d.domain_id, d]));

        for (let i = 1; i < domainsData.length; i++) {
          const row = domainsData[i] as unknown[];
          const id = getCell(row, idxId);
          const dname = getCell(row, idxName);
          if (!id || !dname) continue;
          const isNew = !byId.has(id);
          byId.set(id, {
            domain_id: id,
            domain_name: dname,
            domain_description: getCell(row, idxDesc) || '',
            icon: getCell(row, idxIcon) || 'Folder',
            color: getCell(row, idxColor) || '#6b7280',
            regulatory_relevance: parseCommaList(getCell(row, idxReg)).length ? parseCommaList(getCell(row, idxReg)) : undefined,
            primary_stakeholders: parseCommaList(getCell(row, idxStake)).length ? parseCommaList(getCell(row, idxStake)) : undefined,
          });
          if (isNew) created.domains.push(id);
          else updated.domains.push(id);
        }
        saveDomains(Array.from(byId.values()));
      }
    }

    // --- Parent Metrics ---
    const parentsData = getSheet(wb, LIBRARY_SHEET_NAMES.PARENT_METRICS, xlsxForSheet);
    if (parentsData && parentsData.length >= 2) {
      const headers = (parentsData[0] as unknown[]).map((h) => String(h ?? '').trim());
      const missing = REQUIRED_COLUMNS.ParentMetrics.filter((k) => findLibraryColumnIndex(headers, [k]) < 0);
      if (missing.length > 0) {
        errors.push({ sheet: LIBRARY_SHEET_NAMES.PARENT_METRICS, message: `Missing columns: ${missing.join(', ')}` });
      } else {
        const idxMetricId = findLibraryColumnIndex(headers, ['metric_id']);
        const idxName = findLibraryColumnIndex(headers, ['metric_name']);
        const idxDef = findLibraryColumnIndex(headers, ['definition']);
        const idxFormula = findLibraryColumnIndex(headers, ['generic_formula']);
        const idxClass = findLibraryColumnIndex(headers, ['metric_class']);
        const idxUnit = findLibraryColumnIndex(headers, ['unit_type']);
        const idxDir = findLibraryColumnIndex(headers, ['direction']);
        const idxRollupPhil = findLibraryColumnIndex(headers, ['rollup_philosophy']);
        const idxDomainIds = findLibraryColumnIndex(headers, ['domain_ids']);
        const idxRegRef = findLibraryColumnIndex(headers, ['regulatory_references']);

        for (let i = 1; i < parentsData.length; i++) {
          const row = parentsData[i] as unknown[];
          const metric_id = getCell(row, idxMetricId);
          const metric_name = getCell(row, idxName);
          if (!metric_id || !metric_name) continue;
          parentIdsFromFile.add(metric_id);

          const domainIds = parseCommaList(getCell(row, idxDomainIds));
          if (domainIds.length === 0) {
            errors.push({ row: i + 1, sheet: LIBRARY_SHEET_NAMES.PARENT_METRICS, message: `${metric_id}: domain_ids required` });
            continue;
          }

          const existing = getParentMetric(metric_id);
          const parent: ParentMetric = {
            metric_id,
            metric_name,
            definition: getCell(row, idxDef),
            generic_formula: getCell(row, idxFormula),
            metric_class: pickEnum(getCell(row, idxClass), METRIC_CLASSES, 'CALCULATED'),
            unit_type: pickEnum(getCell(row, idxUnit), UNIT_TYPES, 'RATIO'),
            direction: pickEnum(getCell(row, idxDir), DIRECTIONS, 'NEUTRAL'),
            rollup_philosophy: getCell(row, idxRollupPhil) || 'Not specified',
            domain_ids: domainIds,
            regulatory_references: parseCommaList(getCell(row, idxRegRef)).length ? parseCommaList(getCell(row, idxRegRef)) : undefined,
          };
          upsertParentMetric(parent);
          if (!existing) created.parents.push(metric_id);
          else updated.parents.push(metric_id);
        }
      }
    }

    // --- Variants ---
    const variantsData = getSheet(wb, LIBRARY_SHEET_NAMES.VARIANTS, xlsxForSheet);
    if (variantsData && variantsData.length >= 2) {
      const headers = (variantsData[0] as unknown[]).map((h) => String(h ?? '').trim());
      const missing = REQUIRED_COLUMNS.Variants.filter((k) => findLibraryColumnIndex(headers, [k]) < 0);
      if (missing.length > 0) {
        errors.push({ sheet: LIBRARY_SHEET_NAMES.VARIANTS, message: `Missing columns: ${missing.join(', ')}` });
      } else {
        const idxVariantId = findLibraryColumnIndex(headers, ['variant_id']);
        const idxName = findLibraryColumnIndex(headers, ['variant_name']);
        const idxParentId = findLibraryColumnIndex(headers, ['parent_metric_id']);
        const idxType = findLibraryColumnIndex(headers, ['variant_type']);
        const idxStatus = findLibraryColumnIndex(headers, ['status']);
        const idxFormulaD = findLibraryColumnIndex(headers, ['formula_display']);
        const idxRFac = findLibraryColumnIndex(headers, ['rollup_facility']);
        const idxRCp = findLibraryColumnIndex(headers, ['rollup_counterparty']);
        const idxRDesk = findLibraryColumnIndex(headers, ['rollup_desk']);
        const idxRPort = findLibraryColumnIndex(headers, ['rollup_portfolio']);
        const idxRLob = findLibraryColumnIndex(headers, ['rollup_lob']);
        const idxWeight = findLibraryColumnIndex(headers, ['weighting_basis']);
        const idxExec = findLibraryColumnIndex(headers, ['executable_metric_id']);
        const idxSrcTable = findLibraryColumnIndex(headers, ['source_table']);
        const idxSrcField = findLibraryColumnIndex(headers, ['source_field']);

        for (let i = 1; i < variantsData.length; i++) {
          const row = variantsData[i] as unknown[];
          const variant_id = getCell(row, idxVariantId);
          const variant_name = getCell(row, idxName);
          const parent_metric_id = getCell(row, idxParentId);
          if (!variant_id || !variant_name || !parent_metric_id) continue;

          const parentExists = parentIdsFromFile.has(parent_metric_id) || getParentMetric(parent_metric_id) !== null;
          if (!parentExists) {
            errors.push({ row: i + 1, sheet: LIBRARY_SHEET_NAMES.VARIANTS, message: `parent "${parent_metric_id}" not found` });
            continue;
          }

          const rollupFac = getCell(row, idxRFac);
          const rollupCp = getCell(row, idxRCp);
          const rollupDesk = getCell(row, idxRDesk);
          const rollupPort = getCell(row, idxRPort);
          const rollupLob = getCell(row, idxRLob);
          const rollup_logic = (rollupFac || rollupCp || rollupDesk || rollupPort || rollupLob)
            ? { facility: rollupFac || undefined, counterparty: rollupCp || undefined, desk: rollupDesk || undefined, portfolio: rollupPort || undefined, lob: rollupLob || undefined }
            : { facility: '', counterparty: '', desk: '', portfolio: '', lob: '' };

          const variant: MetricVariant = {
            variant_id,
            variant_name,
            parent_metric_id,
            variant_type: pickEnum(getCell(row, idxType), VARIANT_TYPES, 'CALCULATED'),
            status: pickEnum(getCell(row, idxStatus), VARIANT_STATUSES, 'DRAFT'),
            formula_display: getCell(row, idxFormulaD),
            rollup_logic,
            weighting_basis: getCell(row, idxWeight)
              ? (pickEnum(getCell(row, idxWeight), WEIGHTING_BASIS, 'BY_EAD') as MetricVariant['weighting_basis'])
              : undefined,
            executable_metric_id: getCell(row, idxExec) || null,
            source_table: getCell(row, idxSrcTable) || undefined,
            source_field: getCell(row, idxSrcField) || undefined,
          };

          const existingV = getVariant(variant_id);
          if (existingV) {
            saveVariant({ ...existingV, ...variant });
            updated.variants.push(variant_id);
          } else {
            addVariant(variant);
            created.variants.push(variant_id);
          }
        }
      }
    }

    return NextResponse.json({ success: errors.length === 0, created, updated, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error('Metric library import error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Import failed.' }, { status: 500 });
  }
}
