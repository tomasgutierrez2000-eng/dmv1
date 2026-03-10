/**
 * Unified DDL parser for L1, L2, and L3 SQL files.
 * Used as OFFLINE FALLBACK when DATABASE_URL is not available.
 * The live PostgreSQL database (via introspect-db.ts) is the primary golden source.
 *
 * Handles three DDL formats:
 * - L1: Inline PKs (`TYPE NOT NULL PRIMARY KEY`), CONSTRAINT FOREIGN KEY clauses
 * - L2: Same as L1, plus composite PKs (`PRIMARY KEY (col1, col2)`)
 * - L3: Composite PKs, FK annotations in comments (`-- FK: col → L1.table.field`)
 */

export interface ParsedColumn {
  name: string;
  type: string;       // Exact SQL type from DDL, e.g. "VARCHAR(20)", "NUMERIC(18,2)"
  nullable: boolean;
  pk: boolean;
  fk: string;         // FK target: "l1.table_name(column_name)" or "L1.table.field" (L3 format)
  defaultVal: string;
  checkConstraint: string;
}

export interface ParsedTable {
  name: string;
  schema: string;     // "l1", "l2", "l3"
  columns: ParsedColumn[];
  pkColumns: string[];
}

/**
 * Parse a DDL SQL file and extract all CREATE TABLE definitions.
 * @param sql - The raw SQL content
 * @param schema - Expected schema prefix ('l1', 'l2', or 'l3')
 */
export function parseDDL(sql: string, schema: 'l1' | 'l2' | 'l3'): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const tableRegex = new RegExp(
    `CREATE TABLE IF NOT EXISTS (?:"${schema}"|${schema})\\.(?:"(\\w+)"|(\\w+))\\s*\\(([\\s\\S]*?)\\);`,
    'g',
  );

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1] || match[2];
    const body = match[3];

    // Parse separate PRIMARY KEY clause
    const pkMatch = body.match(/PRIMARY KEY\s*\(([^)]+)\)/);
    const separatePkColumns = pkMatch
      ? pkMatch[1].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      : [];

    // Parse CONSTRAINT FOREIGN KEY clauses (L1/L2 format)
    const fkMap = new Map<string, string>();
    const fkRegex = /CONSTRAINT\s+\w+\s+FOREIGN KEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\.(\w+)\((\w+)\)/g;
    let fkMatch: RegExpExecArray | null;
    while ((fkMatch = fkRegex.exec(body)) !== null) {
      fkMap.set(fkMatch[1], `${fkMatch[2]}.${fkMatch[3]}(${fkMatch[4]})`);
    }

    // Parse L3-style FK comments after the table definition
    if (schema === 'l3') {
      const afterTable = sql.substring(
        match.index + match[0].length,
        match.index + match[0].length + 3000,
      );
      const commentFkRegex = /-- FK:\s+(\w+)\s*→\s*(.+)/g;
      let commentFk: RegExpExecArray | null;
      while ((commentFk = commentFkRegex.exec(afterTable)) !== null) {
        // Stop if we hit the next CREATE TABLE
        if (afterTable.substring(0, commentFk.index).includes('CREATE TABLE')) break;
        fkMap.set(commentFk[1], commentFk[2].trim());
      }
    }

    // Track inline PKs
    const inlinePkColumns: string[] = [];

    // Parse column definitions
    const columns: ParsedColumn[] = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      if (trimmed.startsWith('PRIMARY KEY')) continue;
      if (trimmed.startsWith('CONSTRAINT')) continue;

      // Column pattern: "name" TYPE or name TYPE [NOT NULL] [DEFAULT ...] [PRIMARY KEY] [CHECK (...)]
      const colMatch = trimmed.match(
        /^"?(\w+)"?\s+([\w]+(?:\(\d+(?:,\s*\d+)?\))?)\s*(.*?)(?:,\s*)?$/,
      );
      if (!colMatch) continue;

      const colName = colMatch[1];
      const colType = colMatch[2];
      const rest = colMatch[3] || '';

      // Check for inline PRIMARY KEY
      const isInlinePK = /PRIMARY\s+KEY/i.test(rest);
      if (isInlinePK) inlinePkColumns.push(colName);

      // Check for DEFAULT
      const defaultMatch = rest.match(/DEFAULT\s+('.*?'|[\w()]+)/i);
      const defaultVal = defaultMatch ? defaultMatch[1] : '';

      // Check for CHECK constraint
      const checkMatch = rest.match(/CHECK\s*\(([^)]+)\)/i);
      const checkConstraint = checkMatch ? checkMatch[1] : '';

      // Nullable: NOT NULL means not nullable
      const nullable = !rest.includes('NOT NULL');

      columns.push({
        name: colName,
        type: colType,
        nullable,
        pk: false, // Will be set below
        fk: fkMap.get(colName) ?? '',
        defaultVal,
        checkConstraint,
      });
    }

    // Merge PK sources: inline PKs + separate PRIMARY KEY clause
    const allPkColumns = [...new Set([...inlinePkColumns, ...separatePkColumns])];

    // Set pk flag on columns
    for (const col of columns) {
      col.pk = allPkColumns.includes(col.name);
    }

    tables.push({
      name: tableName,
      schema,
      columns,
      pkColumns: allPkColumns,
    });
  }

  return tables;
}

/**
 * Parse FK string in l1/l2 format: "l1.table_name(field_name)"
 * Returns normalized target for data dictionary.
 */
export function parseFkReference(fk: string): { layer: string; table: string; field: string } | null {
  // Format: "l1.table_name(field_name)" or "l2.table_name(field_name)"
  const m1 = fk.match(/^(l[123])\.(\w+)\((\w+)\)$/);
  if (m1) return { layer: m1[1].toUpperCase(), table: m1[2], field: m1[3] };

  // L3 format: "L1.table_name.field_name" (with optional trailing text)
  const m2 = fk.match(/^(L[123])\.(\w+)\.(\w+)/);
  if (m2) return { layer: m2[1], table: m2[2], field: m2[3] };

  return null;
}
