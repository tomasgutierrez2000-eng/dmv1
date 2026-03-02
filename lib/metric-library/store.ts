/**
 * Data Catalogue — file-based store for domains, parent metrics, and variants.
 * Path: data/metric-library/*.json. DB-ready: swap this module for a DB client later.
 */

import fs from 'fs';
import path from 'path';
import type { MetricDomain, ParentMetric, MetricVariant } from './types';

const LIBRARY_DIR = path.join(process.cwd(), 'data', 'metric-library');
const DOMAINS_PATH = path.join(LIBRARY_DIR, 'domains.json');
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

// Domains
export function getDomains(): MetricDomain[] {
  return readJson<MetricDomain[]>(DOMAINS_PATH, []);
}

export function saveDomains(domains: MetricDomain[]): void {
  writeJson(DOMAINS_PATH, domains);
}

// Parent metrics
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

// Variants
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
