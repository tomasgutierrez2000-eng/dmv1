import { describe, it, expect } from 'vitest';
import {
  formatSqlValue,
  quoteColumn,
  PG_RESERVED_WORDS,
  VARCHAR_EXCEPTION_IDS,
} from '../sql-value-formatter';

/* ────────────────── NULL / undefined handling ────────────────── */

describe('formatSqlValue — null/undefined', () => {
  it('returns NULL for null', () => {
    expect(formatSqlValue('any_column', null)).toBe('NULL');
  });

  it('returns NULL for undefined', () => {
    expect(formatSqlValue('any_column', undefined)).toBe('NULL');
  });
});

/* ────────────────── Exception IDs (VARCHAR despite _id) ────────────────── */

describe('formatSqlValue — exception IDs', () => {
  it('quotes metric_id as VARCHAR', () => {
    expect(formatSqlValue('metric_id', 'MET-001')).toBe("'MET-001'");
  });

  it('quotes variant_id as VARCHAR', () => {
    expect(formatSqlValue('variant_id', 'V1')).toBe("'V1'");
  });

  it('quotes source_metric_id as VARCHAR', () => {
    expect(formatSqlValue('source_metric_id', 'C001')).toBe("'C001'");
  });

  it('quotes mdrm_id as VARCHAR', () => {
    expect(formatSqlValue('mdrm_id', 'BHCK1234')).toBe("'BHCK1234'");
  });

  it('quotes mapped_line_id as VARCHAR', () => {
    expect(formatSqlValue('mapped_line_id', 'LINE-A')).toBe("'LINE-A'");
  });

  it('quotes mapped_column_id as VARCHAR', () => {
    expect(formatSqlValue('mapped_column_id', 'COL-1')).toBe("'COL-1'");
  });

  it('escapes single quotes in exception IDs', () => {
    expect(formatSqlValue('metric_id', "O'Brien")).toBe("'O''Brien'");
  });

  it('handles numeric-looking exception IDs as VARCHAR', () => {
    expect(formatSqlValue('metric_id', '42')).toBe("'42'");
  });

  it('all exception IDs are accounted for', () => {
    expect(VARCHAR_EXCEPTION_IDS.size).toBe(6);
  });
});

/* ────────────────── BIGINT columns (_id suffix) ────────────────── */

describe('formatSqlValue — _id columns (BIGINT)', () => {
  it('formats integer as unquoted', () => {
    expect(formatSqlValue('facility_id', 42)).toBe('42');
  });

  it('formats string integer as unquoted', () => {
    expect(formatSqlValue('counterparty_id', '100')).toBe('100');
  });

  it('returns NULL for NaN', () => {
    expect(formatSqlValue('facility_id', 'not-a-number')).toBe('NULL');
  });

  it('coerces empty string to 0 (Number("") === 0)', () => {
    expect(formatSqlValue('facility_id', '')).toBe('0');
  });

  it('handles zero', () => {
    expect(formatSqlValue('facility_id', 0)).toBe('0');
  });

  it('handles negative', () => {
    expect(formatSqlValue('facility_id', -1)).toBe('-1');
  });

  it('handles float (truncates via Number())', () => {
    expect(formatSqlValue('facility_id', 42.7)).toBe('42.7');
  });
});

/* ────────────────── NUMERIC columns (_amt, _pct, _value, _bps) ────────────────── */

describe('formatSqlValue — NUMERIC columns', () => {
  it('_amt: formats as unquoted number', () => {
    expect(formatSqlValue('committed_facility_amt', 1250000.50)).toBe('1250000.5');
  });

  it('_pct: formats as unquoted number', () => {
    expect(formatSqlValue('coverage_ratio_pct', 85.123456)).toBe('85.123456');
  });

  it('_value: formats as unquoted number', () => {
    expect(formatSqlValue('metric_value', 0.005)).toBe('0.005');
  });

  it('_bps: formats as unquoted number', () => {
    expect(formatSqlValue('interest_rate_spread_bps', 125.5)).toBe('125.5');
  });

  it('_amt: NaN returns 0 (not NULL)', () => {
    expect(formatSqlValue('committed_facility_amt', 'invalid')).toBe('0');
  });

  it('_pct: NaN returns 0', () => {
    expect(formatSqlValue('coverage_ratio_pct', NaN)).toBe('0');
  });

  it('handles zero', () => {
    expect(formatSqlValue('committed_facility_amt', 0)).toBe('0');
  });

  it('handles negative', () => {
    expect(formatSqlValue('committed_facility_amt', -500.25)).toBe('-500.25');
  });

  it('handles string numbers', () => {
    expect(formatSqlValue('committed_facility_amt', '1000.50')).toBe('1000.5');
  });
});

/* ────────────────── INTEGER columns (_count) ────────────────── */

describe('formatSqlValue — _count columns (INTEGER)', () => {
  it('formats as rounded integer', () => {
    expect(formatSqlValue('loan_count', 5)).toBe('5');
  });

  it('rounds float to integer', () => {
    expect(formatSqlValue('loan_count', 5.7)).toBe('6');
  });

  it('rounds 0.5 up', () => {
    expect(formatSqlValue('loan_count', 2.5)).toBe('3');
  });

  it('NaN returns 0', () => {
    expect(formatSqlValue('loan_count', 'abc')).toBe('0');
  });

  it('handles zero', () => {
    expect(formatSqlValue('loan_count', 0)).toBe('0');
  });

  it('handles string numbers', () => {
    expect(formatSqlValue('loan_count', '42')).toBe('42');
  });
});

/* ────────────────── DATE columns (_date) ────────────────── */

describe('formatSqlValue — _date columns (DATE)', () => {
  it('formats string as quoted', () => {
    expect(formatSqlValue('maturity_date', '2025-01-31')).toBe("'2025-01-31'");
  });

  it('formats Date object as YYYY-MM-DD', () => {
    const d = new Date('2025-06-15T00:00:00Z');
    expect(formatSqlValue('maturity_date', d)).toBe("'2025-06-15'");
  });

  it('escapes single quotes in date strings', () => {
    expect(formatSqlValue('maturity_date', "it's")).toBe("'it''s'");
  });
});

/* ────────────────── TIMESTAMP columns (_ts) ────────────────── */

describe('formatSqlValue — _ts columns (TIMESTAMP)', () => {
  it('formats string timestamp as quoted', () => {
    expect(formatSqlValue('created_ts', '2025-01-31 12:00:00')).toBe("'2025-01-31 12:00:00'");
  });

  it('returns DEFAULT for "DEFAULT"', () => {
    expect(formatSqlValue('created_ts', 'DEFAULT')).toBe('DEFAULT');
  });

  it('returns DEFAULT for "CURRENT_TIMESTAMP"', () => {
    expect(formatSqlValue('updated_ts', 'CURRENT_TIMESTAMP')).toBe('DEFAULT');
  });

  it('returns NULL for empty string', () => {
    expect(formatSqlValue('created_ts', '')).toBe('NULL');
  });

  it('formats Date object as ISO string', () => {
    const d = new Date('2025-06-15T10:30:00Z');
    expect(formatSqlValue('created_ts', d)).toBe("'2025-06-15T10:30:00.000Z'");
  });
});

/* ────────────────── BOOLEAN columns (_flag) ────────────────── */

describe('formatSqlValue — _flag columns (BOOLEAN)', () => {
  it('true → TRUE', () => {
    expect(formatSqlValue('is_active_flag', true)).toBe('TRUE');
  });

  it('false → FALSE', () => {
    expect(formatSqlValue('is_active_flag', false)).toBe('FALSE');
  });

  it('"Y" → TRUE', () => {
    expect(formatSqlValue('is_active_flag', 'Y')).toBe('TRUE');
  });

  it('"N" → FALSE', () => {
    expect(formatSqlValue('is_active_flag', 'N')).toBe('FALSE');
  });

  it('"TRUE" → TRUE', () => {
    expect(formatSqlValue('is_active_flag', 'TRUE')).toBe('TRUE');
  });

  it('"FALSE" → FALSE', () => {
    expect(formatSqlValue('is_active_flag', 'FALSE')).toBe('FALSE');
  });

  it('"1" → TRUE', () => {
    expect(formatSqlValue('is_active_flag', '1')).toBe('TRUE');
  });

  it('"0" → FALSE', () => {
    expect(formatSqlValue('is_active_flag', '0')).toBe('FALSE');
  });

  it('lowercase "y" → TRUE', () => {
    expect(formatSqlValue('is_active_flag', 'y')).toBe('TRUE');
  });

  it('lowercase "true" → TRUE', () => {
    expect(formatSqlValue('is_active_flag', 'true')).toBe('TRUE');
  });

  it('unknown string → NULL', () => {
    expect(formatSqlValue('is_active_flag', 'maybe')).toBe('NULL');
  });
});

/* ────────────────── String columns (default) ────────────────── */

describe('formatSqlValue — string columns (default VARCHAR)', () => {
  it('quotes string values', () => {
    expect(formatSqlValue('legal_name', 'Acme Corp')).toBe("'Acme Corp'");
  });

  it('escapes single quotes', () => {
    expect(formatSqlValue('legal_name', "O'Brien & Associates")).toBe("'O''Brien & Associates'");
  });

  it('handles empty string', () => {
    expect(formatSqlValue('legal_name', '')).toBe("''");
  });

  it('handles _code suffix as quoted', () => {
    expect(formatSqlValue('currency_code', 'USD')).toBe("'USD'");
  });

  it('handles _name suffix as quoted', () => {
    expect(formatSqlValue('facility_name', 'Term Loan A')).toBe("'Term Loan A'");
  });
});

/* ────────────────── Non-suffix typed values ────────────────── */

describe('formatSqlValue — unmatched suffix with typed values', () => {
  it('number without matching suffix → unquoted', () => {
    expect(formatSqlValue('some_field', 42)).toBe('42');
  });

  it('Infinity → NULL', () => {
    expect(formatSqlValue('some_field', Infinity)).toBe('NULL');
  });

  it('-Infinity → NULL', () => {
    expect(formatSqlValue('some_field', -Infinity)).toBe('NULL');
  });

  it('NaN number → NULL', () => {
    expect(formatSqlValue('some_field', NaN)).toBe('NULL');
  });

  it('boolean true without _flag suffix → TRUE', () => {
    expect(formatSqlValue('some_field', true)).toBe('TRUE');
  });

  it('boolean false without _flag suffix → FALSE', () => {
    expect(formatSqlValue('some_field', false)).toBe('FALSE');
  });

  it('Date object without _date suffix → YYYY-MM-DD', () => {
    const d = new Date('2025-03-20T00:00:00Z');
    expect(formatSqlValue('some_field', d)).toBe("'2025-03-20'");
  });

  it('object fallback → quoted toString', () => {
    expect(formatSqlValue('some_field', { x: 1 })).toBe("'[object Object]'");
  });
});

/* ────────────────── quoteColumn ────────────────── */

describe('quoteColumn', () => {
  it('quotes "value" (reserved word)', () => {
    expect(quoteColumn('value')).toBe('"value"');
  });

  it('quotes "order" (reserved word)', () => {
    expect(quoteColumn('order')).toBe('"order"');
  });

  it('does not quote "facility_id" (not reserved)', () => {
    expect(quoteColumn('facility_id')).toBe('facility_id');
  });

  it('does not quote "counterparty" (not reserved)', () => {
    expect(quoteColumn('counterparty')).toBe('counterparty');
  });

  it('is case-insensitive', () => {
    expect(quoteColumn('VALUE')).toBe('"VALUE"');
  });

  it('quotes "user" (reserved)', () => {
    expect(quoteColumn('user')).toBe('"user"');
  });

  it('does not quote "name" (not reserved)', () => {
    expect(quoteColumn('name')).toBe('name');
  });
});

/* ────────────────── PG_RESERVED_WORDS completeness ────────────────── */

describe('PG_RESERVED_WORDS', () => {
  it('contains common reserved words', () => {
    for (const word of ['select', 'from', 'where', 'join', 'table', 'value', 'user', 'order', 'group']) {
      expect(PG_RESERVED_WORDS.has(word)).toBe(true);
    }
  });

  it('does not contain common non-reserved words', () => {
    for (const word of ['name', 'status', 'type', 'key', 'comment', 'level', 'role', 'action', 'source']) {
      expect(PG_RESERVED_WORDS.has(word)).toBe(false);
    }
  });
});
