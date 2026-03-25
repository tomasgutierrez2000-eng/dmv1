# Data Quality Agent Template

This is a reference template — not directly invokable. All DQ agents share this structure.

---

## Shared Context Loading (MANDATORY for all DQ agents)

### Step 1: Read Configuration
```
Read .claude/config/bank-profile.yaml
```
Extract: `database.primary` connection, `institution_tier` (drives severity thresholds).

### Step 2: Read Data Dictionary
```
Read facility-summary-mvp/output/data-dictionary/data-dictionary.json
```
Parse L2 array for table names, field names, data_types, pk_fk metadata.

### Step 3: Read CLAUDE.md Conventions
Grep for relevant sections:
- DDL Syntax Rules (reserved words, type contract)
- Data Type Rules (suffix → type mapping)
- FK Referential Integrity Rules
- L1 Reference Data Quality Rules
- Common YAML Formula Bugs table

### Step 4: Load Baseline Profile (if available)
```
Read .claude/audit/dq-baseline/baseline-profile.json
```
Contains pre-computed row counts, null percentages, distinct values per column. If missing, run targeted queries.

## Shared Database Query Pattern

All SQL queries executed via:
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "SQL_HERE"
```

For multi-line queries or queries with single quotes, use heredoc:
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT ... FROM l2.table WHERE column = 'value';
EOSQL
```

For CSV output: add `-F','`
For JSON output: wrap query in `SELECT json_agg(row_to_json(t)) FROM (...) t`

## Shared Finding Format

Every finding is a JSON object:
```json
{
  "finding_id": "DQ-[AGENT_CODE]-NNN",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "table": "l2.table_name",
  "column": "column_name or null",
  "check": "check_name",
  "message": "Human-readable description of the issue",
  "evidence_sql": "SELECT query that demonstrates the issue",
  "evidence_value": "actual output from the query",
  "row_count": 0,
  "fix_sql": "UPDATE/INSERT/DELETE SQL to fix the issue, or null if manual fix needed",
  "rollback_sql": "SQL to reverse the fix, or null",
  "fix_applied": false,
  "fix_verified": false
}
```

## Shared Fix Protocol

When fix_mode is enabled:
1. **Log finding** — Record the issue before any changes
2. **Show fix SQL** — Display the exact SQL that will be executed
3. **Apply fix** — Execute via psql
4. **Verify fix** — Re-run the evidence_sql to confirm the issue is resolved
5. **Log result** — Record fix_applied=true, fix_verified=true/false
6. **Save rollback** — Write rollback SQL to `.claude/audit/dq-fixes/[finding_id].json`

Fix JSON saved to `.claude/audit/dq-fixes/`:
```json
{
  "fix_id": "DQ-FIX-[finding_id]",
  "agent": "dq-[agent-name]",
  "session_id": "uuid",
  "timestamp": "ISO8601",
  "finding_id": "DQ-[AGENT]-NNN",
  "table": "l2.table_name",
  "description": "What was fixed",
  "fix_sql": "SQL that was applied",
  "rollback_sql": "SQL to reverse",
  "rows_affected": 0,
  "verified": true
}
```

## Shared Output Format

Every agent returns:
```json
{
  "agent": "dq-[name]",
  "scope": "dimension|table|narrative",
  "timestamp": "ISO8601",
  "tables_checked": ["l2.table1", "l2.table2"],
  "findings": [ ... ],
  "summary": {
    "total_checks": 0,
    "passed": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "fixes_applied": 0,
    "fixes_verified": 0
  },
  "health_score": 0-100
}
```

Health score formula:
```
health_score = max(0, 100 - (critical * 15 + high * 8 + medium * 3 + low * 1))
```

## Shared Severity Thresholds

| Severity | Criteria | Examples |
|----------|----------|---------|
| CRITICAL | Data integrity broken, FK violations, PK duplicates, wrong layer | Orphaned FK values, duplicate composite PKs |
| HIGH | Business logic violated, unrealistic values, missing metric-critical data | PD > 100%, drawn > committed, all-NULL metric column |
| MEDIUM | Data quality degraded, low diversity, partial coverage | >50% NULL in non-critical column, single categorical value |
| LOW | Cosmetic, minor gaps, suboptimal but functional | Audit timestamps missing, minor date gaps |

## Audit Logging

Write session results to `.claude/audit/dq-sessions/[agent]-[timestamp].json`.
