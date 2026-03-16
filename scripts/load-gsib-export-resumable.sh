#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Load GSIB SQL export in parts — resume from any file if one fails.
#
# Usage:
#   ./scripts/load-gsib-export-resumable.sh           # Full load (drops first)
#   ./scripts/load-gsib-export-resumable.sh 0         # Same as above
#   ./scripts/load-gsib-export-resumable.sh 4         # Resume from 04-l2-seed.sql
#
# If file 04 fails, fix it and run: ./scripts/load-gsib-export-resumable.sh 4
# No need to re-run 01–03.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_DIR="${SQL_DIR:-$ROOT_DIR/sql/gsib-export}"

FILES=(
  "01-l1-ddl.sql"
  "02-l2-ddl.sql"
  "03-l1-seed.sql"
  "04-l2-seed.sql"
  "05-scenario-seed.sql"
  "06-factory-scenarios.sql"
)

START_FROM="${1:-0}"

if [[ -n "${2:-}" ]]; then
  CONN="$2"
else
  if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    source "$ROOT_DIR/.env"
    set +a
  fi
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Set DATABASE_URL in .env or pass: $0 <start_index> 'postgresql://...'" >&2
    exit 1
  fi
  CONN="$DATABASE_URL"
fi

# Ensure psql is on PATH (Homebrew PostgreSQL)
export PATH="/opt/homebrew/opt/postgresql@18/bin:/usr/local/bin:$PATH"

for f in "${FILES[@]}"; do
  [[ -f "$SQL_DIR/$f" ]] || { echo "Missing: $SQL_DIR/$f" >&2; exit 1; }
done

if [[ "$START_FROM" -eq 0 ]]; then
  echo "=== Dropping l1, l2, l3 schemas ==="
  psql "$CONN" -c "DROP SCHEMA IF EXISTS l3 CASCADE; DROP SCHEMA IF EXISTS l2 CASCADE; DROP SCHEMA IF EXISTS l1 CASCADE;" -q
fi

echo "=== Loading from file $START_FROM: ${FILES[$START_FROM]} ==="
for i in $(seq "$START_FROM" $((${#FILES[@]} - 1))); do
  f="${FILES[$i]}"
  echo "  → $f"
  psql "$CONN" -f "$SQL_DIR/$f" -v ON_ERROR_STOP=1
done
echo "=== Done ==="
