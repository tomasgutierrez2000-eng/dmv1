/**
 * Persist model gaps (from Excel ModelGaps sheet) to a JSON file.
 */

import fs from 'fs';
import path from 'path';

export interface ModelGap {
  gapItem: string;
  targetTable: string;
  fieldsRequired: string;
  rationale: string;
  impactedMetrics: string;
}

const MODEL_GAPS_PATH = path.join(process.cwd(), 'data', 'model-gaps.json');

export interface ModelGapsFile {
  version?: number;
  gaps: ModelGap[];
}

const DEFAULT_FILE: ModelGapsFile = { version: 1, gaps: [] };

function ensureDataDir(): void {
  const dir = path.dirname(MODEL_GAPS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readModelGaps(): ModelGap[] {
  if (!fs.existsSync(MODEL_GAPS_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(MODEL_GAPS_PATH, 'utf-8');
    const data = JSON.parse(raw) as ModelGapsFile;
    return Array.isArray(data.gaps) ? data.gaps : [];
  } catch {
    return [];
  }
}

export function writeModelGaps(gaps: ModelGap[]): void {
  ensureDataDir();
  const data: ModelGapsFile = { version: 1, gaps };
  fs.writeFileSync(MODEL_GAPS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}
