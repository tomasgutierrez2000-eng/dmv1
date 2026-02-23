/**
 * Source Mapping Engine — file-based store for source systems, feeds, and mappings.
 * Path: data/source-mapping/*.json. DB-ready: swap for a DB client when needed.
 */

import fs from 'fs';
import path from 'path';
import type { SourceSystem, SourceFeed, MappingRecord } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'source-mapping');
const SOURCES_PATH = path.join(DATA_DIR, 'source-systems.json');
const FEEDS_PATH = path.join(DATA_DIR, 'source-feeds.json');
const MAPPINGS_PATH = path.join(DATA_DIR, 'mappings.json');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
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

export function getSourceSystems(): SourceSystem[] {
  return readJson<SourceSystem[]>(SOURCES_PATH, []);
}

export function getSourceSystem(id: string): SourceSystem | null {
  return getSourceSystems().find((s) => s.source_system_id === id) ?? null;
}

export function saveSourceSystem(system: SourceSystem): void {
  const all = getSourceSystems();
  const idx = all.findIndex((s) => s.source_system_id === system.source_system_id);
  if (idx >= 0) all[idx] = { ...system, updated_at: new Date().toISOString() };
  else all.push({ ...system, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  writeJson(SOURCES_PATH, all);
}

export function getSourceFeeds(sourceSystemId?: string): SourceFeed[] {
  const all = readJson<SourceFeed[]>(FEEDS_PATH, []);
  if (sourceSystemId) return all.filter((f) => f.source_system_id === sourceSystemId);
  return all;
}

export function getSourceFeed(id: string): SourceFeed | null {
  return getSourceFeeds().find((f) => f.feed_id === id) ?? null;
}

export function saveSourceFeed(feed: SourceFeed): void {
  const all = getSourceFeeds();
  const idx = all.findIndex((f) => f.feed_id === feed.feed_id);
  if (idx >= 0) all[idx] = { ...feed, updated_at: new Date().toISOString() };
  else all.push({ ...feed, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  writeJson(FEEDS_PATH, all);
}

export function getMappings(filters?: { metric_ref_id?: string; metric_ref_type?: string; status?: string }): MappingRecord[] {
  let list = readJson<MappingRecord[]>(MAPPINGS_PATH, []);
  if (filters?.metric_ref_id) list = list.filter((m) => m.metric_ref_id === filters.metric_ref_id);
  if (filters?.metric_ref_type) list = list.filter((m) => m.metric_ref_type === filters.metric_ref_type);
  if (filters?.status) list = list.filter((m) => m.status === filters.status);
  return list;
}

export function getMapping(id: string): MappingRecord | null {
  return getMappings().find((m) => m.mapping_id === id) ?? null;
}

export function saveMapping(mapping: MappingRecord): void {
  const all = getMappings();
  const idx = all.findIndex((m) => m.mapping_id === mapping.mapping_id);
  const updated = { ...mapping, updated_at: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated;
  else all.push({ ...updated, created_at: new Date().toISOString() });
  writeJson(MAPPINGS_PATH, all);
}
