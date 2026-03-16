#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Load GSIB SQL export into PostgreSQL (correct order).
#
# Usage:
#   npm run db:load-gsib
#   # or:
#   ./scripts/load-gsib-export.sh
#   ./scripts/load-gsib-export.sh "postgresql://user:pass@host/db?sslmode=require"
#
# Requires: 6 SQL files in sql/gsib-export/ (01–06). Copy from export package.
# Uses DATABASE_URL from .env if set and no connection string passed.
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

if [[ -n "${1:-}" ]]; then
  CONN="$1"
else
  if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    source "$ROOT_DIR/.env"
    set +a
  fi
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Set DATABASE_URL in .env or pass connection string: $0 'postgresql://...'" >&2
    exit 1
  fi
  CONN="$DATABASE_URL"
fi

for f in "${FILES[@]}"; do
  path="$SQL_DIR/$f"
  if [[ ! -f "$path" ]]; then
    echo "Missing: $path (copy GSIB export files into sql/gsib-export/)" >&2
    exit 1
  fi
done

echo "=== Loading GSIB export from $SQL_DIR ==="
for f in "${FILES[@]}"; do
  echo "  → $f"
  psql "$CONN" -f "$SQL_DIR/$f" -v ON_ERROR_STOP=1
done
echo "=== Done ==="
