#!/bin/bash
# Claude Code PostToolUse hook: auto-sync data dictionary after DB schema changes.
#
# Triggers after Bash commands that modify PostgreSQL schema (DDL operations,
# db:load, apply-ddl, psql with schema changes). Runs db:introspect to keep
# the data dictionary in sync with the live database.

# Read tool input from stdin (JSON with tool_name, tool_input, etc.)
INPUT=$(cat)

# Extract the bash command that was run
CMD=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Check if the command involved database schema changes
DB_PATTERNS=(
  "db:load"
  "db:apply"
  "apply-ddl"
  "psql"
  "CREATE TABLE"
  "ALTER TABLE"
  "DROP TABLE"
  "ADD COLUMN"
  "DROP COLUMN"
  "introspect-db"
)

MATCHED=false
for pattern in "${DB_PATTERNS[@]}"; do
  if echo "$CMD" | grep -qi "$pattern"; then
    MATCHED=true
    break
  fi
done

# If a DB-modifying command was detected, run introspection
if [ "$MATCHED" = true ]; then
  # Don't re-trigger if we just ran introspection
  if echo "$CMD" | grep -q "db:introspect"; then
    exit 0
  fi

  echo "  [hook] DB schema change detected — syncing data dictionary..."
  npm run db:introspect 2>&1 | tail -5
  echo "  [hook] Data dictionary synced."
fi
