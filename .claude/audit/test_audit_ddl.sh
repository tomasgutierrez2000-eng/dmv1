#!/usr/bin/env bash
# Validates audit_ddl.sql syntax without executing against a real database.
# Exit 0 = valid syntax, Exit 1 = syntax errors found.
#
# Usage: bash .claude/audit/test_audit_ddl.sh

set -euo pipefail

DDL_FILE="$(dirname "$0")/schema/audit_ddl.sql"

if [ ! -f "$DDL_FILE" ]; then
    echo "FAIL: DDL file not found at $DDL_FILE"
    exit 1
fi

echo "Validating audit DDL syntax..."

# Check 1: No double commas
DOUBLE_COMMAS=$(grep -n ',[ ]*,' "$DDL_FILE" || true)
if [ -n "$DOUBLE_COMMAS" ]; then
    echo "FAIL: Double commas found:"
    echo "$DOUBLE_COMMAS"
    exit 1
fi

# Check 2: Every CREATE TABLE has a PRIMARY KEY
TABLES=$(grep -c 'CREATE TABLE' "$DDL_FILE" || true)
PKS=$(grep -c 'PRIMARY KEY' "$DDL_FILE" || true)
if [ "$PKS" -lt "$TABLES" ]; then
    echo "FAIL: Found $TABLES CREATE TABLE statements but only $PKS PRIMARY KEY constraints"
    exit 1
fi

# Check 3: Every REFERENCES target exists as a CREATE TABLE in the same file
REFS=$(grep 'REFERENCES audit\.' "$DDL_FILE" | sed 's/.*REFERENCES audit\.\([a-z_]*\).*/\1/' | sort -u)
for ref in $REFS; do
    if ! grep -q "CREATE TABLE audit\.$ref" "$DDL_FILE"; then
        echo "FAIL: REFERENCES audit.$ref but no CREATE TABLE audit.$ref found"
        exit 1
    fi
done

# Check 4: Every CREATE INDEX references a table that exists
INDEXED_TABLES=$(grep 'ON audit\.' "$DDL_FILE" | sed 's/.*ON audit\.\([a-z_]*\).*/\1/' | sort -u)
for tbl in $INDEXED_TABLES; do
    if ! grep -q "CREATE TABLE audit\.$tbl\|CREATE VIEW audit\.$tbl" "$DDL_FILE"; then
        echo "FAIL: Index references audit.$tbl but table/view not found"
        exit 1
    fi
done

# Check 5: COMMENT ON TABLE targets exist
COMMENTED_TABLES=$(grep 'COMMENT ON TABLE audit\.' "$DDL_FILE" | sed 's/.*COMMENT ON TABLE audit\.\([a-z_]*\).*/\1/' | sort -u)
for tbl in $COMMENTED_TABLES; do
    if ! grep -q "CREATE TABLE audit\.$tbl" "$DDL_FILE"; then
        echo "FAIL: COMMENT ON TABLE audit.$tbl but table not found"
        exit 1
    fi
done

echo "PASS: All $TABLES tables, $PKS primary keys, FK references valid, indexes valid, comments valid."
echo "DDL syntax validation complete."
