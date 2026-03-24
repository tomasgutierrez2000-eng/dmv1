/**
 * PK Registry — in-memory registry of primary keys for FK validation.
 *
 * Structurally prevents FK violations by tracking every PK that exists
 * (in PG or in generated data) and checking every FK before emission.
 *
 * Usage:
 *   1. Pre-load from PG: registry.preloadFromPG(client, tables)
 *   2. Register generated rows: registry.registerRow(table, row)
 *   3. Check FK before emit: registry.checkFK(childTable, fkColumn, value, parentTable, parentColumn)
 */

/* ────────────────── PK Registry ────────────────── */

export class PKRegistry {
  /** Map of "schema.table:column" → Set<serialized PK value> */
  private pks = new Map<string, Set<string>>();

  /** Track composite PKs: "schema.table" → Set<"col1_val|col2_val"> */
  private compositePks = new Map<string, Set<string>>();

  /**
   * Register a PK value. Call after generating each row.
   */
  registerPK(qualifiedTable: string, pkColumns: string[], row: Record<string, unknown>): void {
    // Register individual column PKs
    for (const col of pkColumns) {
      const key = `${qualifiedTable}:${col}`;
      if (!this.pks.has(key)) this.pks.set(key, new Set());
      const value = row[col];
      if (value !== null && value !== undefined) {
        this.pks.get(key)!.add(String(value));
      }
    }

    // Register composite PK
    if (pkColumns.length > 1) {
      if (!this.compositePks.has(qualifiedTable)) this.compositePks.set(qualifiedTable, new Set());
      const compositeKey = pkColumns.map(c => String(row[c] ?? '')).join('|');
      this.compositePks.get(qualifiedTable)!.add(compositeKey);
    }
  }

  /**
   * Check if a FK value exists in the parent table's PKs.
   */
  checkFK(
    parentTable: string,
    parentColumn: string,
    value: unknown,
  ): boolean {
    if (value === null || value === undefined) return true; // NULL FKs are allowed
    const key = `${parentTable}:${parentColumn}`;
    const pks = this.pks.get(key);
    if (!pks) return false; // Parent table not registered at all
    return pks.has(String(value));
  }

  /**
   * Check if a composite PK already exists (duplicate detection).
   */
  hasCompositePK(qualifiedTable: string, pkColumns: string[], row: Record<string, unknown>): boolean {
    const existing = this.compositePks.get(qualifiedTable);
    if (!existing) return false;
    const compositeKey = pkColumns.map(c => String(row[c] ?? '')).join('|');
    return existing.has(compositeKey);
  }

  /**
   * Pre-load PKs from PostgreSQL.
   * Queries each table for its distinct PK values.
   */
  async preloadFromPG(
    client: any, // pg.Client
    tables: Array<{ qualifiedName: string; pkColumns: string[] }>,
  ): Promise<{ loaded: number; errors: string[] }> {
    let loaded = 0;
    const errors: string[] = [];

    for (const { qualifiedName, pkColumns } of tables) {
      const [schema, tableName] = qualifiedName.split('.');
      // Sanitize identifiers — PG doesn't support parameterized table/column names
      if (!/^[a-z][a-z0-9_]*$/.test(schema) || !/^[a-z][a-z0-9_]*$/.test(tableName)) continue;
      try {
        for (const col of pkColumns) {
          if (!/^[a-z][a-z0-9_]*$/.test(col)) continue;
          const result = await client.query(
            `SELECT DISTINCT ${col}::text FROM ${schema}.${tableName} WHERE ${col} IS NOT NULL LIMIT 100000`,
          );
          const key = `${qualifiedName}:${col}`;
          if (!this.pks.has(key)) this.pks.set(key, new Set());
          const pkSet = this.pks.get(key)!;
          for (const row of result.rows) {
            pkSet.add(row[col]);
          }
          loaded += result.rows.length;
        }
      } catch {
        errors.push(`Failed to load PKs for ${qualifiedName}`);
      }
    }

    return { loaded, errors };
  }

  /**
   * Bulk register from existing data (e.g., from SQL file parsing).
   */
  registerBulk(qualifiedTable: string, column: string, values: (string | number)[]): void {
    const key = `${qualifiedTable}:${column}`;
    if (!this.pks.has(key)) this.pks.set(key, new Set());
    const pkSet = this.pks.get(key)!;
    for (const v of values) {
      pkSet.add(String(v));
    }
  }

  /**
   * Get the count of registered PKs for a table:column.
   */
  getCount(qualifiedTable: string, column: string): number {
    const key = `${qualifiedTable}:${column}`;
    return this.pks.get(key)?.size ?? 0;
  }

  /**
   * Get all registered PK values for a table:column.
   */
  getValues(qualifiedTable: string, column: string): Set<string> {
    const key = `${qualifiedTable}:${column}`;
    return this.pks.get(key) ?? new Set();
  }

  /**
   * Summary stats.
   */
  summary(): { tables: number; totalPKs: number } {
    let totalPKs = 0;
    const tables = new Set<string>();
    for (const [key, values] of this.pks) {
      tables.add(key.split(':')[0]);
      totalPKs += values.size;
    }
    return { tables: tables.size, totalPKs };
  }
}
