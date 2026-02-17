/**
 * Parses sql/l3/01_DDL_all_tables.sql and outputs scripts/l3/output/l3-table-fields.json
 * with field-level metadata: name, dataType, fkTarget (from -- FK: comments).
 * Run: npx tsx scripts/l3/parse-ddl.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const DDL_PATH = path.join(process.cwd(), 'sql/l3/01_DDL_all_tables.sql');
const OUT_PATH = path.join(process.cwd(), 'scripts/l3/output/l3-table-fields.json');

type FkTarget = { layer: string; table: string; field: string };
type FieldSpec = { name: string; dataType?: string; fkTarget?: FkTarget; formula?: string; sourceFields?: string };
type TableFields = { tableName: string; category: string; fields: FieldSpec[] };

const FK_LINE = /^\s*--\s*FK:\s*(\w+)\s*→\s*(L\d)\.(\w+)\.(\w+)/;

function parseDdl(content: string): TableFields[] {
  const result: TableFields[] = [];
  const createRegex = /CREATE TABLE IF NOT EXISTS l3\.(\w+)\s*\(([\s\S]*?)\)\s*;/g;
  let block: RegExpExecArray | null;
  while ((block = createRegex.exec(content)) !== null) {
    const tableName = block[1];
    const body = block[2];
    const category = extractCategory(content, block.index);
    const fields: FieldSpec[] = [];
    const fkByField = new Map<string, FkTarget>();

    // Parse column lines: "col_name ... TYPE ..." or "col_name TYPE ..."
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const colMatch = line.match(/^(\w+)\s+(VARCHAR|NUMERIC|INTEGER|BIGINT|DATE|TIMESTAMP|BOOLEAN|TEXT|DECIMAL|SMALLINT)/i);
      if (colMatch) {
        const name = colMatch[1];
        const dataType = colMatch[2].toUpperCase();
        fields.push({ name, dataType });
      }
    }

    // FK comments follow the ); on subsequent lines until next CREATE
    const afterBlock = content.slice(block.index + block[0].length, block.index + block[0].length + 2000);
    const fkLines = afterBlock.split('\n');
    for (const line of fkLines) {
      const m = line.match(FK_LINE);
      if (m) {
        const [, fieldName, layer, table, field] = m;
        fkByField.set(fieldName.trim(), { layer, table, field });
      }
      if (line.match(/^\s*--\s*T\d+:/) || line.startsWith('CREATE TABLE')) break;
    }

    for (const f of fields) {
      const fk = fkByField.get(f.name);
      if (fk) {
        f.fkTarget = fk;
        f.sourceFields = `${fk.layer}.${fk.table}.${fk.field}`;
      }
    }

    result.push({ tableName, category, fields });
  }
  return result;
}

function extractCategory(fullContent: string, createIndex: number): string {
  const before = fullContent.slice(Math.max(0, createIndex - 400), createIndex);
  const commentMatch = before.match(/--\s*T\d+:\s*\w+\s*\(([^)]+)\)/);
  if (commentMatch) return commentMatch[1].trim();
  return 'L3';
}

function main() {
  const content = fs.readFileSync(DDL_PATH, 'utf-8');
  const tables = parseDdl(content);
  const byTable: Record<string, { category: string; fields: FieldSpec[] }> = {};
  for (const t of tables) {
    byTable[t.tableName] = { category: t.category, fields: t.fields };
  }
  const outDir = path.dirname(OUT_PATH);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(byTable, null, 2), 'utf-8');
  console.log(`Wrote ${Object.keys(byTable).length} L3 tables to ${OUT_PATH}`);
}

main();
