import { NextRequest, NextResponse } from 'next/server';
import {
  LIBRARY_SHEET_NAMES,
  REQUIRED_COLUMNS,
  findLibraryColumnIndex,
  getCell,
  parseCommaList,
  parseBool,
} from '@/lib/metric-library/excel-template';
import {
  getDomains,
  saveDomains,
  getParentMetrics,
  getParentMetric,
  upsertParentMetric,
  getVariant,
  saveVariant,
  addVariant,
  refreshParentVariantCounts,
} from '@/lib/metric-library/store';
import type { MetricDomain, ParentMetric, MetricVariant, SourcePayloadFieldSpec, RollupLevelKey, SourcingCategory } from '@/lib/metric-library/types';
import { ROLLUP_HIERARCHY_LEVELS } from '@/lib/metric-library/types';

const METRIC_CLASSES = ['SOURCED', 'CALCULATED', 'HYBRID'] as const;
const UNIT_TYPES = ['RATIO', 'PERCENTAGE', 'CURRENCY', 'COUNT', 'RATE', 'ORDINAL', 'DAYS', 'INDEX'] as const;
const DIRECTIONS = ['HIGHER_BETTER', 'LOWER_BETTER', 'NEUTRAL'] as const;
const VARIANT_TYPES = ['SOURCED', 'CALCULATED'] as const;
const VARIANT_STATUSES = ['ACTIVE', 'DRAFT', 'DEPRECATED', 'PROPOSED', 'INACTIVE'] as const;
const REVIEW_CYCLES = ['ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'AD_HOC'] as const;
const WEIGHTING_BASIS = ['BY_EAD', 'BY_OUTSTANDING', 'BY_COMMITTED'] as const;
const SOURCING_LEVELS = ROLLUP_HIERARCHY_LEVELS;
const SOURCING_CATEGORIES = ['obligor', 'facility', 'facility_with_exceptions', 'dual_level', 'flexible_level', 'configuration'] as const;

function pickEnum<T extends string>(value: string, allowed: readonly T[], defaultVal: T): T {
  const v = value.toUpperCase().replace(/\s/g, '_');
  if (allowed.includes(v as T)) return v as T;
  return defaultVal;
}

/** Normalize Excel value to rollup/sourcing level key (lowercase). */
function normalizeSourcingLevel(value: string): string {
  return value.trim().toLowerCase();
}

/** Normalize Excel value to sourcing category (lowercase, spaces → underscores). */
function normalizeSourcingCategory(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function parsePayloadSpec(raw: string): { source_payload_spec?: SourcePayloadFieldSpec[] } {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? { source_payload_spec: parsed as SourcePayloadFieldSpec[] } : {};
  } catch {
    return {};
  }
}

type XlsxUtils = { utils: { sheet_to_json: (sheet: unknown, opts?: { header?: number; defval?: null }) => unknown[] } };

/** Read a sheet by name from workbook; returns array of rows or null if sheet missing. */
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

/** POST: import Metric Library from Excel (Domains, ParentMetrics, Variants sheets). */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided. Use form field "file".' }, { status: 400 });
    }

    const name = (file.name ?? '').toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
    if (!isExcel) {
      return NextResponse.json(
        { error: 'File must be an Excel workbook (.xlsx or .xls). Download the template from the Metric Library page.' },
        { status: 400 }
      );
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
      return NextResponse.json(
        {
          error:
            'Workbook must contain at least one of: "Domains", "ParentMetrics", or "Variants" sheet. Download the template from the Metric Library page.',
        },
        { status: 400 }
      );
    }

    const errors: ImportResult['errors'] = [];
    const created = { domains: [] as string[], parents: [] as string[], variants: [] as string[] };
    const updated = { domains: [] as string[], parents: [] as string[], variants: [] as string[] };

    const parentIdsFromFile = new Set<string>();

    // --- Domains ---
    const domainsData = getSheet(wb, LIBRARY_SHEET_NAMES.DOMAINS, xlsxForSheet);
    if (domainsData && domainsData.length >= 2) {
      const headers = (domainsData[0] as unknown[]).map((h) => String(h ?? '').trim());
      const reqCols = REQUIRED_COLUMNS.Domains;
      const missing = reqCols.filter((k) => findLibraryColumnIndex(headers, [k]) < 0);
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
          const name = getCell(row, idxName);
          if (!id || !name) continue;
          const isNew = !byId.has(id);
          const domain: MetricDomain = {
            domain_id: id,
            domain_name: name,
            domain_description: getCell(row, idxDesc) || '',
            icon: getCell(row, idxIcon) || 'Folder',
            color: getCell(row, idxColor) || '#6b7280',
            regulatory_relevance: parseCommaList(getCell(row, idxReg)).length ? parseCommaList(getCell(row, idxReg)) : undefined,
            primary_stakeholders: parseCommaList(getCell(row, idxStake)).length ? parseCommaList(getCell(row, idxStake)) : undefined,
          };
          byId.set(id, domain);
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
      const reqCols = REQUIRED_COLUMNS.ParentMetrics;
      const missing = reqCols.filter((k) => findLibraryColumnIndex(headers, [k]) < 0);
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
        const idxRisk = findLibraryColumnIndex(headers, ['risk_appetite_relevant']);
        const idxRollupPhil = findLibraryColumnIndex(headers, ['rollup_philosophy']);
        const idxRollupDesc = findLibraryColumnIndex(headers, ['rollup_description']);
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
            errors.push({ row: i + 1, sheet: LIBRARY_SHEET_NAMES.PARENT_METRICS, message: `metric_id ${metric_id}: domain_ids required` });
            continue;
          }

          const existing = getParentMetric(metric_id);
          const isNew = !existing;
          const parent: ParentMetric = {
            metric_id,
            metric_name,
            definition: getCell(row, idxDef),
            generic_formula: getCell(row, idxFormula),
            metric_class: pickEnum(getCell(row, idxClass), METRIC_CLASSES, 'CALCULATED'),
            unit_type: pickEnum(getCell(row, idxUnit), UNIT_TYPES, 'RATIO'),
            direction: pickEnum(getCell(row, idxDir), DIRECTIONS, 'NEUTRAL'),
            risk_appetite_relevant: parseBool(getCell(row, idxRisk)),
            rollup_philosophy: getCell(row, idxRollupPhil) || 'Not specified',
            rollup_description: getCell(row, idxRollupDesc) || '',
            domain_ids: domainIds,
            regulatory_references: parseCommaList(getCell(row, idxRegRef)).length
              ? parseCommaList(getCell(row, idxRegRef))
              : undefined,
          };
          upsertParentMetric(parent);
          if (isNew) created.parents.push(metric_id);
          else updated.parents.push(metric_id);
        }
      }
    }

    // --- Variants ---
    const variantsData = getSheet(wb, LIBRARY_SHEET_NAMES.VARIANTS, xlsxForSheet);
    if (variantsData && variantsData.length >= 2) {
      const headers = (variantsData[0] as unknown[]).map((h) => String(h ?? '').trim());
      const reqCols = REQUIRED_COLUMNS.Variants;
      const missing = reqCols.filter((k) => findLibraryColumnIndex(headers, [k]) < 0);
      if (missing.length > 0) {
        errors.push({ sheet: LIBRARY_SHEET_NAMES.VARIANTS, message: `Missing columns: ${missing.join(', ')}` });
      } else {
        const idxVariantId = findLibraryColumnIndex(headers, ['variant_id']);
        const idxName = findLibraryColumnIndex(headers, ['variant_name']);
        const idxParentId = findLibraryColumnIndex(headers, ['parent_metric_id']);
        const idxType = findLibraryColumnIndex(headers, ['variant_type']);
        const idxStatus = findLibraryColumnIndex(headers, ['status']);
        const idxVersion = findLibraryColumnIndex(headers, ['version']);
        const idxEffDate = findLibraryColumnIndex(headers, ['effective_date']);
        const idxFormulaD = findLibraryColumnIndex(headers, ['formula_display']);
        const idxFormulaS = findLibraryColumnIndex(headers, ['formula_specification']);
        const idxDesc = findLibraryColumnIndex(headers, ['detailed_description']);
        const idxRFac = findLibraryColumnIndex(headers, ['rollup_facility']);
        const idxRCp = findLibraryColumnIndex(headers, ['rollup_counterparty']);
        const idxRDesk = findLibraryColumnIndex(headers, ['rollup_desk']);
        const idxRPort = findLibraryColumnIndex(headers, ['rollup_portfolio']);
        const idxRLob = findLibraryColumnIndex(headers, ['rollup_lob']);
        const idxWeight = findLibraryColumnIndex(headers, ['weighting_basis']);
        const idxExec = findLibraryColumnIndex(headers, ['executable_metric_id']);
        const idxOwner = findLibraryColumnIndex(headers, ['owner_team']);
        const idxApprover = findLibraryColumnIndex(headers, ['approver']);
        const idxReview = findLibraryColumnIndex(headers, ['review_cycle']);
        const idxSourceSys = findLibraryColumnIndex(headers, ['source_system']);
        const idxSourceField = findLibraryColumnIndex(headers, ['source_field_name']);
        const idxRefresh = findLibraryColumnIndex(headers, ['refresh_frequency']);
        const idxDash = findLibraryColumnIndex(headers, ['used_by_dashboards']);
        const idxRegRef = findLibraryColumnIndex(headers, ['regulatory_references']);
        const idxCalcTier = findLibraryColumnIndex(headers, ['calculation_authority_tier']);
        const idxCalcTierFuture = findLibraryColumnIndex(headers, ['calculation_authority_tier_future']);
        const idxCalcRationale = findLibraryColumnIndex(headers, ['calculation_authority_rationale']);
        const idxCalcComponents = findLibraryColumnIndex(headers, ['calculation_authority_components']);
        const idxCalcFutureEvol = findLibraryColumnIndex(headers, ['calculation_authority_future_evolution']);
        const idxCalcMigration = findLibraryColumnIndex(headers, ['calculation_authority_migration_path']);
        const idxExpectedGsib = findLibraryColumnIndex(headers, ['expected_gsib_data_source']);
        const idxIntPattern = findLibraryColumnIndex(headers, ['source_integration_pattern']);
        const idxDeliveryMethod = findLibraryColumnIndex(headers, ['source_delivery_method']);
        const idxEndpointFeed = findLibraryColumnIndex(headers, ['source_endpoint_or_feed']);
        const idxSourceVariantId = findLibraryColumnIndex(headers, ['source_variant_identifier']);
        const idxPayloadSpec = findLibraryColumnIndex(headers, ['source_payload_spec']);
        const idxSetupNotes = findLibraryColumnIndex(headers, ['source_setup_validation_notes']);
        const idxAtomicSourcing = findLibraryColumnIndex(headers, ['atomic_sourcing_level']);
        const idxReconAnchors = findLibraryColumnIndex(headers, ['reconciliation_anchor_levels']);
        const idxSourcingRationale = findLibraryColumnIndex(headers, ['sourcing_level_rationale']);
        const idxSourcingDoNot = findLibraryColumnIndex(headers, ['sourcing_do_not_source']);
        const idxSourcingCategory = findLibraryColumnIndex(headers, ['sourcing_category']);
        const idxDataFormat = findLibraryColumnIndex(headers, ['data_format']);
        const idxDataLag = findLibraryColumnIndex(headers, ['data_lag']);

        for (let i = 1; i < variantsData.length; i++) {
          const row = variantsData[i] as unknown[];
          const variant_id = getCell(row, idxVariantId);
          const variant_name = getCell(row, idxName);
          const parent_metric_id = getCell(row, idxParentId);
          if (!variant_id || !variant_name || !parent_metric_id) continue;

          const parentExists = parentIdsFromFile.has(parent_metric_id) || getParentMetric(parent_metric_id) !== null;
          if (!parentExists) {
            errors.push({
              row: i + 1,
              sheet: LIBRARY_SHEET_NAMES.VARIANTS,
              message: `parent_metric_id "${parent_metric_id}" not found. Add it in ParentMetrics sheet or in the library first.`,
            });
            continue;
          }

          const effective_date = getCell(row, idxEffDate) || new Date().toISOString().slice(0, 10);
          const rollupFac = getCell(row, idxRFac);
          const rollupCp = getCell(row, idxRCp);
          const rollupDesk = getCell(row, idxRDesk);
          const rollupPort = getCell(row, idxRPort);
          const rollupLob = getCell(row, idxRLob);
          const rollup_logic =
            rollupFac || rollupCp || rollupDesk || rollupPort || rollupLob
              ? {
                  facility: rollupFac || undefined,
                  counterparty: rollupCp || undefined,
                  desk: rollupDesk || undefined,
                  portfolio: rollupPort || undefined,
                  lob: rollupLob || undefined,
                }
              : undefined;

          const variant: MetricVariant = {
            variant_id,
            variant_name,
            parent_metric_id,
            variant_type: pickEnum(getCell(row, idxType), VARIANT_TYPES, 'CALCULATED'),
            status: pickEnum(getCell(row, idxStatus), VARIANT_STATUSES, 'DRAFT'),
            version: getCell(row, idxVersion) || 'v1.0',
            effective_date,
            formula_display: getCell(row, idxFormulaD),
            formula_specification: getCell(row, idxFormulaS) || undefined,
            detailed_description: getCell(row, idxDesc) || undefined,
            rollup_logic,
            weighting_basis: getCell(row, idxWeight)
              ? (pickEnum(getCell(row, idxWeight), WEIGHTING_BASIS, 'BY_EAD') as 'BY_EAD' | 'BY_OUTSTANDING' | 'BY_COMMITTED')
              : undefined,
            executable_metric_id: getCell(row, idxExec) || null,
            owner_team: getCell(row, idxOwner) || undefined,
            approver: getCell(row, idxApprover) || undefined,
            review_cycle: getCell(row, idxReview)
              ? (pickEnum(getCell(row, idxReview), REVIEW_CYCLES, 'ANNUAL') as 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'AD_HOC')
              : undefined,
            source_system: getCell(row, idxSourceSys) || undefined,
            source_field_name: getCell(row, idxSourceField) || undefined,
            refresh_frequency: getCell(row, idxRefresh) || undefined,
            used_by_dashboards: parseCommaList(getCell(row, idxDash)).length
              ? parseCommaList(getCell(row, idxDash))
              : undefined,
            regulatory_references: parseCommaList(getCell(row, idxRegRef)).length
              ? parseCommaList(getCell(row, idxRegRef))
              : undefined,
            ...(getCell(row, idxCalcTier) && { calculation_authority_tier: pickEnum(getCell(row, idxCalcTier), ['T1', 'T2', 'T3'], 'T1') as 'T1' | 'T2' | 'T3' }),
            ...(getCell(row, idxCalcTierFuture) && { calculation_authority_tier_future: pickEnum(getCell(row, idxCalcTierFuture), ['T1', 'T2', 'T3'], 'T1') as 'T1' | 'T2' | 'T3' }),
            ...(getCell(row, idxCalcRationale) && { calculation_authority_rationale: getCell(row, idxCalcRationale) }),
            ...(getCell(row, idxCalcComponents) && { calculation_authority_components: getCell(row, idxCalcComponents) }),
            ...(getCell(row, idxCalcFutureEvol) && { calculation_authority_future_evolution: getCell(row, idxCalcFutureEvol) }),
            ...(getCell(row, idxCalcMigration) && { calculation_authority_migration_path: getCell(row, idxCalcMigration) }),
            ...(getCell(row, idxExpectedGsib) && { expected_gsib_data_source: getCell(row, idxExpectedGsib) }),
            ...(getCell(row, idxIntPattern) && { source_integration_pattern: pickEnum(getCell(row, idxIntPattern), ['PUSH', 'PULL'], 'PULL') as 'PUSH' | 'PULL' }),
            ...(getCell(row, idxDeliveryMethod) && { source_delivery_method: getCell(row, idxDeliveryMethod) }),
            ...(getCell(row, idxEndpointFeed) && { source_endpoint_or_feed: getCell(row, idxEndpointFeed) }),
            ...(getCell(row, idxSourceVariantId) && { source_variant_identifier: getCell(row, idxSourceVariantId) }),
            ...(getCell(row, idxSetupNotes) && { source_setup_validation_notes: getCell(row, idxSetupNotes) }),
            ...((): Partial<MetricVariant> => {
              const rawLevel = getCell(row, idxAtomicSourcing);
              if (!rawLevel) return {};
              const level = normalizeSourcingLevel(rawLevel);
              return SOURCING_LEVELS.includes(level as RollupLevelKey) ? { atomic_sourcing_level: level as RollupLevelKey } : {};
            })(),
            ...((): Partial<MetricVariant> => {
              const raw = getCell(row, idxReconAnchors);
              if (!raw) return {};
              const levels = parseCommaList(raw)
                .map((l) => normalizeSourcingLevel(l))
                .filter((l): l is RollupLevelKey => SOURCING_LEVELS.includes(l as RollupLevelKey));
              return { reconciliation_anchor_levels: levels };
            })(),
            ...(getCell(row, idxSourcingRationale) && { sourcing_level_rationale: getCell(row, idxSourcingRationale) }),
            ...(getCell(row, idxSourcingDoNot) && { sourcing_do_not_source: getCell(row, idxSourcingDoNot) }),
            ...((): Partial<MetricVariant> => {
              const rawCat = getCell(row, idxSourcingCategory);
              if (!rawCat) return {};
              const cat = normalizeSourcingCategory(rawCat);
              return SOURCING_CATEGORIES.includes(cat as SourcingCategory) ? { sourcing_category: cat as SourcingCategory } : {};
            })(),
            ...(getCell(row, idxDataFormat) && { data_format: getCell(row, idxDataFormat) }),
            ...(getCell(row, idxDataLag) && { data_lag: getCell(row, idxDataLag) }),
            ...parsePayloadSpec(getCell(row, idxPayloadSpec)),
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

    refreshParentVariantCounts();

    const success = errors.length === 0;
    return NextResponse.json({
      success,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Metric library import error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed.' },
      { status: 500 }
    );
  }
}
