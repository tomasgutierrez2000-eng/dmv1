/**
 * Data Catalogue — file-based store for domains and catalogue items.
 * Path: data/metric-library/*.json. DB-ready: swap this module for a DB client later.
 */

import fs from 'fs';
import path from 'path';
import type { MetricDomain, ParentMetric, MetricVariant, CatalogueItem } from './types';

const LIBRARY_DIR = path.join(process.cwd(), 'data', 'metric-library');
const DOMAINS_PATH = path.join(LIBRARY_DIR, 'domains.json');
const CATALOGUE_PATH = path.join(LIBRARY_DIR, 'catalogue.json');
const PARENT_METRICS_PATH = path.join(LIBRARY_DIR, 'parent-metrics.json');
const VARIANTS_PATH = path.join(LIBRARY_DIR, 'variants.json');

function ensureDir(): void {
  if (!fs.existsSync(LIBRARY_DIR)) {
    fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  }
}

function readJson<T>(filePath: string, defaultValue: T): T {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Domains ───────────────────────────────────────────────────────────────────

export function getDomains(): MetricDomain[] {
  return readJson<MetricDomain[]>(DOMAINS_PATH, []);
}

export function saveDomains(domains: MetricDomain[]): void {
  writeJson(DOMAINS_PATH, domains);
}

// ─── Catalogue Items ───────────────────────────────────────────────────────────

export function getCatalogueItems(filters?: {
  kind?: string;
  domain_id?: string;
  status?: string;
  search?: string;
}): CatalogueItem[] {
  const all = readJson<CatalogueItem[]>(CATALOGUE_PATH, []);
  let list = all;

  if (filters?.kind) {
    list = list.filter((item) => item.kind === filters.kind);
  }
  if (filters?.status) {
    list = list.filter((item) => item.status === filters.status);
  }
  if (filters?.domain_id) {
    list = list.filter((item) => item.domain_ids?.includes(filters.domain_id!));
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (item) =>
        item.item_id.toLowerCase().includes(q) ||
        item.item_name.toLowerCase().includes(q) ||
        item.abbreviation.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        item.ingredient_fields.some(
          (f) =>
            f.table.toLowerCase().includes(q) ||
            f.field.toLowerCase().includes(q)
        )
    );
  }

  return list;
}

export function getCatalogueItem(itemId: string): CatalogueItem | null {
  const all = readJson<CatalogueItem[]>(CATALOGUE_PATH, []);
  return all.find((item) => item.item_id === itemId) ?? null;
}

export function saveCatalogueItems(items: CatalogueItem[]): void {
  writeJson(CATALOGUE_PATH, items);
}

export function upsertCatalogueItem(item: CatalogueItem): void {
  const all = readJson<CatalogueItem[]>(CATALOGUE_PATH, []);
  const idx = all.findIndex((i) => i.item_id === item.item_id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  writeJson(CATALOGUE_PATH, all);
}

// ─── Legacy: Parent metrics (kept for backward compat) ─────────────────────────

export function getParentMetrics(domainId?: string): ParentMetric[] {
  const all = readJson<ParentMetric[]>(PARENT_METRICS_PATH, []);
  if (!domainId) return all;
  return all.filter((p) => p.domain_ids?.includes(domainId));
}

export function getParentMetric(metricId: string): ParentMetric | null {
  const all = readJson<ParentMetric[]>(PARENT_METRICS_PATH, []);
  return all.find((p) => p.metric_id === metricId) ?? null;
}

export function saveParentMetrics(parents: ParentMetric[]): void {
  writeJson(PARENT_METRICS_PATH, parents);
}

export function upsertParentMetric(parent: ParentMetric): void {
  const all = readJson<ParentMetric[]>(PARENT_METRICS_PATH, []);
  const idx = all.findIndex((p) => p.metric_id === parent.metric_id);
  if (idx >= 0) all[idx] = parent;
  else all.push(parent);
  writeJson(PARENT_METRICS_PATH, all);
}

// ─── Legacy: Variants (kept for backward compat) ───────────────────────────────

export function getVariants(filters?: {
  parent_metric_id?: string;
  status?: string;
  domain_id?: string;
  executable_only?: boolean;
}): MetricVariant[] {
  const all = readJson<MetricVariant[]>(VARIANTS_PATH, []);
  let list = all;

  if (filters?.parent_metric_id) {
    list = list.filter((v) => v.parent_metric_id === filters.parent_metric_id);
  }
  if (filters?.status) {
    list = list.filter((v) => v.status === filters.status);
  }
  if (filters?.executable_only) {
    list = list.filter((v) => v.executable_metric_id);
  }
  if (filters?.domain_id) {
    const parents = getParentMetrics(filters.domain_id);
    const parentIds = new Set(parents.map((p) => p.metric_id));
    list = list.filter((v) => parentIds.has(v.parent_metric_id));
  }

  return list;
}

export function getVariant(variantId: string): MetricVariant | null {
  const all = readJson<MetricVariant[]>(VARIANTS_PATH, []);
  return all.find((v) => v.variant_id === variantId) ?? null;
}

export function getVariantByExecutableMetricId(executableMetricId: string): MetricVariant | null {
  const all = readJson<MetricVariant[]>(VARIANTS_PATH, []);
  return all.find((v) => v.executable_metric_id === executableMetricId) ?? null;
}

export function saveVariants(variants: MetricVariant[]): void {
  writeJson(VARIANTS_PATH, variants);
}

export function saveVariant(variant: MetricVariant): void {
  const all = readJson<MetricVariant[]>(VARIANTS_PATH, []);
  const idx = all.findIndex((v) => v.variant_id === variant.variant_id);
  if (idx >= 0) all[idx] = variant;
  else all.push(variant);
  writeJson(VARIANTS_PATH, all);
}

export function addVariant(variant: MetricVariant): void {
  const all = readJson<MetricVariant[]>(VARIANTS_PATH, []);
  if (all.some((v) => v.variant_id === variant.variant_id)) {
    throw new Error(`Variant ${variant.variant_id} already exists`);
  }
  all.push(variant);
  writeJson(VARIANTS_PATH, all);
}
