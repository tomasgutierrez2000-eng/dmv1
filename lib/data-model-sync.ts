/**
 * Shared helpers for keeping the data dictionary, DDL files, and optional DB in sync.
 * Used by generate-ddl, apply-ddl, upload-excel, and all data-model mutation API routes.
 */

import fs from 'fs';
import path from 'path';
import { getSqlLayerDir, getProjectRoot } from '@/lib/config';
import type { DataDictionary, DataDictionaryField } from './data-dictionary';
import { readDataDictionary, writeDataDictionary, findTable, layerToSchema } from './data-dictionary';
import {
  generateL3Ddl,
  generateLayerDdl,
  buildCreateTable,
  buildDropTable,
  buildAddColumn,
  buildDropColumn,
  buildRenameColumn,
  buildAlterColumnType,
  sqlTypeForField,
} from './ddl-generator';
import { runIntrospection } from './introspect';

// ═══════════════════════════════════════════════════════════════════════════
// DDL file writing
// ═══════════════════════════════════════════════════════════════════════════

/** Write DDL files for each non-empty layer. Also mirrors to gsib-export/. Returns paths written. */
export function writeDdlFiles(dd: DataDictionary): string[] {
  const written: string[] = [];
  for (const layer of ['L1', 'L2', 'L3'] as const) {
    if (dd[layer].length === 0) continue;
    const content =
      layer === 'L3' ? generateL3Ddl(dd) : generateLayerDdl(dd, layer);

    // Primary location: sql/{layer}/01_DDL_all_tables.sql
    const sqlDir = getSqlLayerDir(layer.toLowerCase() as 'l1' | 'l2' | 'l3');
    if (!fs.existsSync(sqlDir)) {
      fs.mkdirSync(sqlDir, { recursive: true });
    }
    const ddlPath = path.join(sqlDir, '01_DDL_all_tables.sql');
    fs.writeFileSync(ddlPath, content, 'utf-8');
    written.push(ddlPath);

    // Mirror to gsib-export/ for L1/L2 if directory exists
    if (layer === 'L1' || layer === 'L2') {
      const gsibDir = path.join(getProjectRoot(), 'sql', 'gsib-export');
      if (fs.existsSync(gsibDir)) {
        const gsibFile = layer === 'L1' ? '01-l1-ddl.sql' : '02-l2-ddl.sql';
        const gsibPath = path.join(gsibDir, gsibFile);
        fs.writeFileSync(gsibPath, content, 'utf-8');
        written.push(gsibPath);
      }
    }
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

// ═══════════════════════════════════════════════════════════════════════════
// Post-mutation sync pipeline
// ═══════════════════════════════════════════════════════════════════════════

type Layer = 'L1' | 'L2' | 'L3';

export type MutationType =
  | { kind: 'add-table'; layer: Layer; tableName: string }
  | { kind: 'update-table'; layer: Layer; tableName: string }
  | { kind: 'delete-table'; layer: Layer; tableName: string }
  | { kind: 'add-field'; layer: Layer; tableName: string; fieldName: string }
  | { kind: 'update-field'; layer: Layer; tableName: string; fieldName: string; oldFieldName?: string }
  | { kind: 'delete-field'; layer: Layer; tableName: string; fieldName: string };

export interface SyncReport {
  ddlFilesWritten: string[];
  dbApplied: boolean;
  dbError?: string;
  introspected: boolean;
  introspectError?: string;
}

/**
 * Execute targeted SQL against PostgreSQL for the given mutation.
 * Returns { ok, error? }.
 */
async function applyTargetedSql(
  dd: DataDictionary,
  mutation: MutationType,
  databaseUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  let sql = '';

  switch (mutation.kind) {
    case 'add-table': {
      const table = findTable(dd, mutation.layer, mutation.tableName);
      if (!table) return { ok: false, error: `Table ${mutation.tableName} not found in DD after mutation` };
      const schema = layerToSchema(mutation.layer);
      sql = `CREATE SCHEMA IF NOT EXISTS ${schema};\n${buildCreateTable(table, schema)}`;
      break;
    }
    case 'delete-table': {
      sql = buildDropTable(mutation.layer, mutation.tableName);
      break;
    }
    case 'add-field': {
      const table = findTable(dd, mutation.layer, mutation.tableName);
      if (!table) return { ok: false, error: `Table ${mutation.tableName} not found in DD` };
      const field = table.fields.find(f => f.name === mutation.fieldName);
      if (!field) return { ok: false, error: `Field ${mutation.fieldName} not found in DD` };
      sql = buildAddColumn(mutation.layer, mutation.tableName, field);
      break;
    }
    case 'delete-field': {
      sql = buildDropColumn(mutation.layer, mutation.tableName, mutation.fieldName);
      break;
    }
    case 'update-field': {
      const parts: string[] = [];
      // Rename if old name differs
      if (mutation.oldFieldName && mutation.oldFieldName !== mutation.fieldName) {
        parts.push(buildRenameColumn(mutation.layer, mutation.tableName, mutation.oldFieldName, mutation.fieldName));
      }
      // Type change — look up new type from DD
      const table = findTable(dd, mutation.layer, mutation.tableName);
      if (table) {
        const field = table.fields.find(f => f.name === mutation.fieldName);
        if (field) {
          const newType = sqlTypeForField(field);
          parts.push(buildAlterColumnType(mutation.layer, mutation.tableName, mutation.fieldName, newType));
        }
      }
      sql = parts.join('\n');
      break;
    }
    case 'update-table': {
      // Category is metadata only — no SQL needed
      return { ok: true };
    }
  }

  if (!sql.trim()) return { ok: true };

  try {
    const pg = await import('pg');
    const client = new pg.default.Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 10_000,
      ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();
    try {
      await client.query(sql);
      return { ok: true };
    } finally {
      await client.end();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Post-mutation sync pipeline. Call after writing the updated DataDictionary.
 *
 * Pipeline:
 * 1. Regenerate DDL files for ALL layers
 * 2. If DATABASE_URL is set, apply targeted SQL to PostgreSQL
 * 3. If DB apply succeeded, run introspection to round-trip the DD
 *
 * Never throws — returns SyncReport with error details.
 */
export async function postMutationSync(
  dd: DataDictionary,
  mutation: MutationType,
): Promise<SyncReport> {
  const result: SyncReport = {
    ddlFilesWritten: [],
    dbApplied: false,
    introspected: false,
  };

  // 1. Regenerate DDL files for ALL layers
  try {
    result.ddlFilesWritten = writeDdlFiles(dd);
  } catch (e) {
    // DDL write failure is non-fatal for the mutation response
    console.error('[postMutationSync] DDL write error:', e);
  }

  // 2. Apply targeted SQL to PostgreSQL (best-effort)
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return result;

  const dbResult = await applyTargetedSql(dd, mutation, databaseUrl);
  result.dbApplied = dbResult.ok;
  if (!dbResult.ok) {
    result.dbError = dbResult.error;
    return result; // Skip introspection if DB apply failed
  }

  // 3. Round-trip introspection (best-effort)
  try {
    await runIntrospection(dd, databaseUrl);
    writeDataDictionary(dd);
    result.introspected = true;
  } catch (e) {
    result.introspectError = e instanceof Error ? e.message : String(e);
  }

  return result;
}
