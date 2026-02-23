/**
 * Accuracy Assurance Engine — file-based store for validation runs and breaks.
 */

import fs from 'fs';
import path from 'path';
import type { ValidationRun, ReconciliationBreak } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'accuracy-assurance');
const RUNS_PATH = path.join(DATA_DIR, 'validation-runs.json');
const BREAKS_PATH = path.join(DATA_DIR, 'breaks.json');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(filePath: string, defaultValue: T): T {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getValidationRuns(filters?: { layer?: number }): ValidationRun[] {
  let list = readJson<ValidationRun[]>(RUNS_PATH, []);
  if (filters?.layer != null) list = list.filter((r) => r.layer === filters.layer);
  return list.sort((a, b) => (new Date(b.run_at ?? 0).getTime() - new Date(a.run_at ?? 0).getTime()));
}

export function saveValidationRun(run: ValidationRun): void {
  const all = getValidationRuns();
  all.unshift({ ...run, run_at: run.run_at ?? new Date().toISOString() });
  writeJson(RUNS_PATH, all.slice(0, 1000));
}

export function getBreaks(filters?: { status?: string }): ReconciliationBreak[] {
  let list = readJson<ReconciliationBreak[]>(BREAKS_PATH, []);
  if (filters?.status) list = list.filter((b) => b.status === filters.status);
  return list;
}

export function getOpenBreaks(): ReconciliationBreak[] {
  return getBreaks().filter((b) => b.status !== 'Resolved' && b.status !== 'Closed');
}

export function saveBreak(b: ReconciliationBreak): void {
  const all = getBreaks();
  const idx = all.findIndex((x) => x.break_id === b.break_id);
  if (idx >= 0) all[idx] = b;
  else all.push(b);
  writeJson(BREAKS_PATH, all);
}
