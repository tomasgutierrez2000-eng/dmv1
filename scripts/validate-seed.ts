/**
 * Validates DDL + seed SQL by parsing INSERT types against DDL column types.
 */
import fs from 'fs';
import path from 'path';

interface ColumnDef { name: string; type: string; }

function parseDDL(sql: string): Map<string, ColumnDef[]> {
  const tables = new Map<string, ColumnDef[]>();
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)\s*\(([\s\S]*?)(?:\);)/gi;
  let match;
  while ((match = createRegex.exec(sql)) !== null) {
    const tableName = match[1]!.toLowerCase();
    const body = match[2]!;
    const columns: ColumnDef[] = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim().replace(/,$/, '');
      if (!trimmed || trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('PRIMARY') ||
          trimmed.startsWith('FOREIGN') || trimmed.startsWith('UNIQUE') || trimmed.startsWith('CHECK') ||
          trimmed.startsWith(')') || trimmed.startsWith('--')) continue;
      const colMatch = trimmed.match(/^(\w+)\s+([\w(),.]+)/);
      if (colMatch) columns.push({ name: colMatch[1]!, type: colMatch[2]!.toUpperCase() });
    }
    tables.set(tableName, columns);
  }
  return tables;
}

function isNumericType(t: string) { return /^(INTEGER|BIGINT|SMALLINT|INT|NUMERIC|DECIMAL|REAL|FLOAT|DOUBLE)/i.test(t); }
function isDateType(t: string) { return /^(DATE|TIMESTAMP)/i.test(t); }
function isStringType(t: string) { return /^(VARCHAR|CHAR|TEXT|STRING)/i.test(t); }

function validateInserts(sql: string, tables: Map<string, ColumnDef[]>) {
  const errors: string[] = [];
  let total = 0;
  const insertRegex = /INSERT\s+INTO\s+(\S+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\);/gi;
  let match;
  while ((match = insertRegex.exec(sql)) !== null) {
    total++;
    const tableName = match[1]!.toLowerCase();
    const colNames = match[2]!.split(',').map(c => c.trim().toLowerCase());
    const valuesStr = match[3]!;
    const tableDef = tables.get(tableName);
    if (!tableDef) continue;
    const values: string[] = [];
    let current = '', inString = false, depth = 0;
    for (let i = 0; i < valuesStr.length; i++) {
      const ch = valuesStr[i]!;
      if (ch === "'" && !inString) { inString = true; current += ch; }
      else if (ch === "'" && inString) { if (valuesStr[i+1]==="'") { current += "''"; i++; } else { inString = false; current += ch; } }
      else if (ch === '(' && !inString) { depth++; current += ch; }
      else if (ch === ')' && !inString) { depth--; current += ch; }
      else if (ch === ',' && !inString && depth === 0) { values.push(current.trim()); current = ''; }
      else current += ch;
    }
    if (current.trim()) values.push(current.trim());
    for (let i = 0; i < Math.min(colNames.length, values.length); i++) {
      const colName = colNames[i]!, value = values[i]!;
      const colDef = tableDef.find(c => c.name.toLowerCase() === colName);
      if (!colDef || value === 'NULL' || value === 'CURRENT_TIMESTAMP') continue;
      const isQuoted = value.startsWith("'") && value.endsWith("'");
      const unquoted = isQuoted ? value.slice(1, -1) : value;
      if (isNumericType(colDef.type) && isQuoted && isNaN(Number(unquoted)))
        errors.push(`[CRASH] ${tableName}.${colName} (${colDef.type}): string '${unquoted}' into numeric`);
      if (isDateType(colDef.type) && isQuoted && !/^\d{4}-\d{2}-\d{2}/.test(unquoted))
        errors.push(`[CRASH] ${tableName}.${colName} (${colDef.type}): '${unquoted}' not a valid date`);
      if (isStringType(colDef.type) && !isQuoted && !/^(NULL|CURRENT_TIMESTAMP|TRUE|FALSE)$/i.test(value) && /^[\d.+-]/.test(value))
        errors.push(`[CRASH] ${tableName}.${colName} (${colDef.type}): unquoted numeric ${value} into varchar/text`);
    }
  }
  return { errors, total };
}

const args = process.argv.slice(2);
const ddlFile = args[0];
const seedFile = args[1];
if (!ddlFile || !seedFile) { console.error('Usage: validate-seed.ts <ddl.sql> <seed.sql>'); process.exit(1); }
const ddlSql = fs.readFileSync(ddlFile, 'utf-8');
const seedSql = fs.readFileSync(seedFile, 'utf-8');
const tables = parseDDL(ddlSql);
console.log(`Parsed ${tables.size} tables from DDL`);
const { errors, total } = validateInserts(seedSql, tables);
console.log(`Checked ${total} INSERTs`);
if (errors.length === 0) { console.log('ALL PASSED'); process.exit(0); }
const unique = [...new Set(errors)];
console.log(`FAILED: ${errors.length} errors (${unique.length} unique)`);
for (const e of unique) console.log(`  ${e}`);
process.exit(1);
