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
  # Don't re-trigger if we just ran introspection or full sync
  if echo "$CMD" | grep -qE "db:introspect|sync:all"; then
    exit 0
  fi

  # Don't trigger for stripe operations (they target stripe DBs, not main)
  if echo "$CMD" | grep -qE "stripe:create|stripe:sync|stripe:diff|test:stripe"; then
    exit 0
  fi

  # Don't sync capital if the command was already targeting postgres_capital
  if echo "$CMD" | grep -q "postgres_capital"; then
    exit 0
  fi

  # Extract table names from DDL commands for incremental introspection
  TABLES=$(echo "$CMD" | python3 -c "
import sys, re
cmd = sys.stdin.read()
tables = set()
for m in re.finditer(r'(?:CREATE|ALTER|DROP)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(?:l[123]\.)?(\w+)', cmd, re.IGNORECASE):
    tables.add(m.group(1))
if tables:
    print(','.join(sorted(tables)))
" 2>/dev/null)

  if [ -n "$TABLES" ]; then
    echo "  [hook] Incremental introspection for: $TABLES"
    npm run db:introspect -- --tables="$TABLES" 2>&1 | tail -5
  else
    echo "  [hook] DB schema change detected — syncing data dictionary..."
    npm run db:introspect 2>&1 | tail -5
  fi
  echo "  [hook] Data dictionary synced."

  # Auto-sync changes to postgres_capital (silent if capital DB is unavailable)
  echo "  [hook] Syncing changes to postgres_capital..."
  npm run db:sync-capital -- --yes 2>&1 | tail -5
  echo "  [hook] Capital DB sync complete."

  # Auto-sync doc counts in CLAUDE.md and playbook after schema changes
  echo "  [hook] Syncing doc counts (CLAUDE.md + playbook)..."
  npm run doc:sync 2>&1 | tail -5
  echo "  [hook] Doc counts synced."
fi
