/**
 * Shared helpers for keeping the data dictionary, DDL files, and optional DB in sync.
 * Used by generate-ddl, apply-ddl, and upload-excel.
 */

import fs from 'fs';
import path from 'path';
import type { DataDictionary } from './data-dictionary';
import { readDataDictionary } from './data-dictionary';
import { generateL3Ddl, generateLayerDdl } from './ddl-generator';

/** Write DDL files for each non-empty layer. Returns paths written. */
export function writeDdlFiles(dd: DataDictionary): string[] {
  const written: string[] = [];
  for (const layer of ['L1', 'L2', 'L3'] as const) {
    if (dd[layer].length === 0) continue;
    const sqlDir = path.join(process.cwd(), 'sql', layer.toLowerCase());
    if (!fs.existsSync(sqlDir)) {
      fs.mkdirSync(sqlDir, { recursive: true });
    }
    const ddlPath = path.join(sqlDir, '01_DDL_all_tables.sql');
    const content =
      layer === 'L3' ? generateL3Ddl(dd) : generateLayerDdl(dd, layer);
    fs.writeFileSync(ddlPath, content, 'utf-8');
    written.push(ddlPath);
  }
  return written;
}

/** Build full DDL SQL string for all layers (for dry run or execution). */
export function buildFullDdl(dd: DataDictionary): string {
  const parts: string[] = [];
  for (const layer of ['L1', 'L2', 'L3'] as const) {
    if (dd[layer].length === 0) continue;
    const content =
      layer === 'L3' ? generateL3Ddl(dd) : generateLayerDdl(dd, layer);
    parts.push(`-- ${layer}\n${content}`);
  }
  return parts.join('\n\n');
}

/** Execute DDL against PostgreSQL. Requires DATABASE_URL and optional pg. */
export async function executeDdl(
  dd: DataDictionary
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fullSql = buildFullDdl(dd);
  if (!fullSql.trim()) {
    return { ok: false, error: 'No DDL to run. Add tables to the data model first.' };
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      ok: false,
      error:
        'DATABASE_URL is not set. Set it in environment to execute DDL against PostgreSQL.',
    };
  }
  try {
    const pg = await import('pg');
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query(fullSql);
      return { ok: true };
    } finally {
      await client.end();
    }
  } catch (e) {
    const isModuleNotFound =
      (e instanceof Error && (e as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') ||
      (e instanceof Error && e.message?.includes('Cannot find module'));
    if (isModuleNotFound) {
      return {
        ok: false,
        error:
          'Optional dependency "pg" is not installed. Run: npm install pg. Then set DATABASE_URL to execute DDL.',
      };
    }
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Database execution failed: ${message}` };
  }
}

/** Generate DDL files from current data dictionary on disk. Returns paths or null if no dictionary. */
export function generateAndWriteDdlFromDisk(): string[] | null {
  const dd = readDataDictionary();
  if (!dd) return null;
  return writeDdlFiles(dd);
}
