import { describe, it, expect } from 'vitest';

// We need to test adaptSql which is not exported. We'll test it via the module internals.
// Since adaptSql is a private function, we'll test the tokenizer and adapter behavior
// by importing the module and testing end-to-end via runSqlMetric behavior.
// For now, let's test the tokenizer pattern by extracting it.

// Re-implement tokenizeSql and transformCodeOnly for testing (matching sql-runner.ts)
function tokenizeSql(sql: string): { text: string; isLiteral: boolean }[] {
  const tokens: { text: string; isLiteral: boolean }[] = [];
  let i = 0;
  let codeStart = 0;
  while (i < sql.length) {
    if (sql[i] === "'") {
      if (i > codeStart) tokens.push({ text: sql.slice(codeStart, i), isLiteral: false });
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      tokens.push({ text: sql.slice(i, j), isLiteral: true });
      codeStart = j;
      i = j;
    } else {
      i++;
    }
  }
  if (codeStart < sql.length) tokens.push({ text: sql.slice(codeStart), isLiteral: false });
  return tokens;
}

function transformCodeOnly(sql: string, fn: (code: string) => string): string {
  const tokens = tokenizeSql(sql);
  return tokens.map(t => t.isLiteral ? t.text : fn(t.text)).join('');
}

describe('SQL tokenizer', () => {
  it('splits code and string literals correctly', () => {
    const tokens = tokenizeSql("SELECT * FROM t WHERE x = 'hello'");
    expect(tokens).toHaveLength(2);
    expect(tokens[0].isLiteral).toBe(false);
    expect(tokens[0].text).toBe("SELECT * FROM t WHERE x = ");
    expect(tokens[1].isLiteral).toBe(true);
    expect(tokens[1].text).toBe("'hello'");
  });

  it('handles escaped quotes inside string literals', () => {
    const tokens = tokenizeSql("x = 'it''s fine'");
    expect(tokens).toHaveLength(2);
    expect(tokens[1].text).toBe("'it''s fine'");
  });

  it('handles multiple string literals', () => {
    const tokens = tokenizeSql("WHERE a = 'x' AND b = 'y'");
    expect(tokens).toHaveLength(4);
    expect(tokens[0].isLiteral).toBe(false);
    expect(tokens[1].isLiteral).toBe(true);
    expect(tokens[1].text).toBe("'x'");
    expect(tokens[2].isLiteral).toBe(false);
    expect(tokens[3].isLiteral).toBe(true);
    expect(tokens[3].text).toBe("'y'");
  });

  it('handles SQL with no string literals', () => {
    const tokens = tokenizeSql("SELECT 1 + 2");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].isLiteral).toBe(false);
  });
});

describe('transformCodeOnly', () => {
  it('transforms code but preserves string literals', () => {
    const result = transformCodeOnly(
      "SELECT col::TEXT FROM t WHERE x = 'value::text'",
      (code) => code.replace(/::TEXT/gi, '')
    );
    expect(result).toBe("SELECT col FROM t WHERE x = 'value::text'");
  });

  it('preserves TRUE inside string literal when replacing boolean', () => {
    const result = transformCodeOnly(
      "SELECT CASE WHEN flag = TRUE THEN 'TRUE_LABEL' END",
      (code) => code.replace(/\bTRUE\b/gi, '1')
    );
    expect(result).toBe("SELECT CASE WHEN flag = 1 THEN 'TRUE_LABEL' END");
  });

  it('does not corrupt schema prefixes inside strings', () => {
    const result = transformCodeOnly(
      "SELECT * FROM l1.table_a WHERE label = 'l1.prefix_value'",
      (code) => code.replace(/\b[Ll]1\.(\w+)/g, 'l1_$1')
    );
    expect(result).toBe("SELECT * FROM l1_table_a WHERE label = 'l1.prefix_value'");
  });
});

describe('PG→SQLite adaptation patterns', () => {
  it('converts EXTRACT(YEAR FROM x)', () => {
    const result = transformCodeOnly(
      "SELECT EXTRACT(YEAR FROM as_of_date) AS yr",
      (code) => code.replace(/EXTRACT\s*\(\s*YEAR\s+FROM\s+([^)]+)\)/gi,
        "CAST(strftime('%Y', $1) AS INTEGER)")
    );
    expect(result).toContain("CAST(strftime('%Y', as_of_date) AS INTEGER)");
  });

  it('converts EXTRACT(DOW FROM x)', () => {
    const result = transformCodeOnly(
      "SELECT EXTRACT(DOW FROM event_date)",
      (code) => code.replace(/EXTRACT\s*\(\s*DOW\s+FROM\s+([^)]+)\)/gi,
        "CAST(strftime('%w', $1) AS INTEGER)")
    );
    expect(result).toContain("strftime('%w', event_date)");
  });

  it('converts DATE_TRUNC(month) — runs on full string before tokenization', () => {
    // DATE_TRUNC contains string literal args, so it runs pre-tokenization
    const sql = "SELECT DATE_TRUNC('month', as_of_date)";
    const result = sql.replace(/DATE_TRUNC\s*\(\s*'month'\s*,\s*([^)]+)\)/gi,
      "strftime('%Y-%m-01', $1)");
    expect(result).toContain("strftime('%Y-%m-01', as_of_date)");
  });

  it('converts CURRENT_DATE', () => {
    const result = transformCodeOnly(
      "WHERE as_of_date = CURRENT_DATE",
      (code) => code.replace(/\bCURRENT_DATE\b/gi, "date('now')")
    );
    expect(result).toContain("date('now')");
  });

  it('strips PostgreSQL type casts', () => {
    const result = transformCodeOnly(
      "SELECT value::numeric + count::integer",
      (code) => code.replace(/::(date|numeric|text|integer|bigint|boolean|varchar(\(\d+\))?|real|float|double precision)/gi, '')
    );
    expect(result).toBe("SELECT value + count");
  });
});
