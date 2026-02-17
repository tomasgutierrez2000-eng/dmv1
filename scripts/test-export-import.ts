/**
 * Test schema export/import (JSON + Excel) and model diff.
 * Run: npx tsx scripts/test-export-import.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import type { DataModel } from '../types/model';
import { modelToSchemaExport } from '../utils/schemaExport';
import { schemaExportToModel } from '../utils/schemaExport';
import {
  schemaToFieldsSheetData,
  schemaToRelationshipsSheetData,
  parseSchemaFromWorkbook,
} from '../utils/schemaExportExcel';
import { computeModelDiff } from '../utils/modelDiff';

function makeMinimalModel(): DataModel {
  return {
    tables: {
      'L1.facility_master': {
        key: 'L1.facility_master',
        name: 'facility_master',
        layer: 'L1',
        category: 'Facilities',
        fields: [
          { name: 'facility_id', description: 'PK', isPK: true, isFK: false },
          { name: 'counterparty_id', description: 'FK', isPK: false, isFK: true, fkTarget: { layer: 'L1', table: 'counterparty_master', field: 'counterparty_id' } },
        ],
      },
      'L1.counterparty_master': {
        key: 'L1.counterparty_master',
        name: 'counterparty_master',
        layer: 'L1',
        category: 'Counterparties',
        fields: [
          { name: 'counterparty_id', description: 'PK', isPK: true, isFK: false },
        ],
      },
    },
    relationships: [
      {
        id: 'L1.facility_master.counterparty_id->L1.counterparty_master.counterparty_id',
        source: { layer: 'L1', table: 'facility_master', field: 'counterparty_id', tableKey: 'L1.facility_master' },
        target: { layer: 'L1', table: 'counterparty_master', field: 'counterparty_id', tableKey: 'L1.counterparty_master' },
        isCrossLayer: false,
        relationshipType: 'primary',
      },
    ],
    categories: ['Facilities', 'Counterparties'],
    layers: ['L1'],
  };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('Testing schema export/import...\n');

  const model = makeMinimalModel();

  // --- JSON round-trip ---
  console.log('1. JSON round-trip');
  const exported = modelToSchemaExport(model);
  assert(exported.fields.length >= 3, 'exported.fields');
  assert(exported.relationships.length === 1, 'exported.relationships');

  const fromJson = schemaExportToModel(exported);
  assert(Object.keys(fromJson.tables).length === 2, 'fromJson tables count');
  assert(fromJson.relationships.length === 1, 'fromJson relationships');
  assert(fromJson.tables['L1.facility_master'].fields.length === 2, 'facility_master fields');
  assert(fromJson.tables['L1.facility_master'].fields[1].fkTarget?.table === 'counterparty_master', 'FK target');
  console.log('   OK: Model -> JSON export -> import matches.\n');

  // --- Excel round-trip (using xlsx in Node) ---
  console.log('2. Excel round-trip');
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const fieldsData = schemaToFieldsSheetData(exported);
  const relData = schemaToRelationshipsSheetData(exported);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fieldsData), 'Fields');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(relData), 'Relationships');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const wbRead = XLSX.read(buf, { type: 'buffer' });
  const getSheet = (name: string) => {
    const ws = wbRead.Sheets[name];
    if (!ws) return null;
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];
    return { data };
  };
  const parsed = parseSchemaFromWorkbook(getSheet);
  assert(parsed.fields.length >= 3, 'parsed.fields');
  assert(parsed.relationships.length === 1, 'parsed.relationships');

  const fromExcel = schemaExportToModel(parsed);
  assert(Object.keys(fromExcel.tables).length === 2, 'fromExcel tables');
  assert(fromExcel.relationships.length === 1, 'fromExcel relationships');
  const fm = fromExcel.tables['L1.facility_master'];
  assert(fm.fields[1].isFK && fm.fields[1].fkTarget?.table === 'counterparty_master', 'FK from Excel');
  console.log('   OK: Model -> Excel export -> parse -> import matches.\n');

  // --- Diff: import into empty ---
  console.log('3. Diff (current=null, imported=model)');
  const diffEmpty = computeModelDiff(null, model);
  assert(diffEmpty.summary.tablesAdded === 2, 'tablesAdded');
  assert(diffEmpty.summary.relationshipsAdded === 1, 'relationshipsAdded');
  console.log('   OK: Diff summary correct.\n');

  // --- Diff: no change ---
  console.log('4. Diff (same model)');
  const diffSame = computeModelDiff(model, fromJson);
  assert(diffSame.tablesAdded.length === 0 && diffSame.tablesRemoved.length === 0, 'no table change');
  console.log('   OK: No false changes.\n');

  // --- Empty Relationships sheet (header only) ---
  console.log('5. Excel with empty Relationships sheet');
  const relHeaders = relData[0];
  const getSheet2 = (name: string) => {
    const data = name === 'Fields' ? fieldsData : name === 'Relationships' ? [relHeaders] : null;
    return data ? { data } : null;
  };
  const parsedEmptyRels = parseSchemaFromWorkbook(getSheet2);
  assert(parsedEmptyRels.relationships.length === 0, 'empty relationships');
  assert(parsedEmptyRels.fields.length >= 3, 'fields still parsed');
  console.log('   OK: Parses without crash.\n');

  // --- Optional: write Excel to disk for manual check ---
  const outDir = path.join(process.cwd(), 'scripts', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const excelPath = path.join(outDir, 'test-schema-export.xlsx');
  fs.writeFileSync(excelPath, buf);
  console.log('6. Wrote', excelPath, 'for manual inspection.\n');

  console.log('All tests passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
