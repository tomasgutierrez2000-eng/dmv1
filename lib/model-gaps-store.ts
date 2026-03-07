/**
 * Persist model gaps (from Excel ModelGaps sheet) to a JSON file.
 */

import fs from 'fs';
import path from 'path';
import { getModelGapsPath } from '@/lib/config';

export interface ModelGap {
  gapItem: string;
  targetTable: string;
  fieldsRequired: string;
  rationale: string;
  impactedMetrics: string;
}

export interface ModelGapsFile {
  version?: number;
  gaps: ModelGap[];
}

const DEFAULT_FILE: ModelGapsFile = { version: 1, gaps: [] };

function ensureDataDir(): void {
  const p = getModelGapsPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readModelGaps(): ModelGap[] {
  const p = getModelGapsPath();
  if (!fs.existsSync(p)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const data = JSON.parse(raw) as ModelGapsFile;
    return Array.isArray(data.gaps) ? data.gaps : [];
  } catch {
    return [];
  }
}

export function writeModelGaps(gaps: ModelGap[]): void {
  ensureDataDir();
  const data: ModelGapsFile = { version: 1, gaps };
  fs.writeFileSync(getModelGapsPath(), JSON.stringify(data, null, 2), 'utf-8');
}
