#!/usr/bin/env bash
# ============================================================
# package-for-migration.sh
#
# Creates a self-contained zip of the Credit Risk Data Model
# Platform, ready for deployment in a new environment.
#
# Usage: bash scripts/package-for-migration.sh [--output-dir /path]
#
# Produces: credit-risk-platform-YYYYMMDD-HHMMSS.zip
# ============================================================
set -euo pipefail

# ── Phase 0: Setup ──────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_DIR="$ROOT_DIR"

while [[ $# -gt 0 ]]; do
  case $1 in
    --output-dir) OUTPUT_DIR="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

STAGING="$(mktemp -d)/credit-risk-platform-$TIMESTAMP"
mkdir -p "$STAGING"

for tool in zip rsync; do
  if ! command -v "$tool" &>/dev/null; then
    echo "Error: $tool is required but not found."; exit 1
  fi
done

echo "=== Credit Risk Platform — Migration Packager ==="
echo "Source:  $ROOT_DIR"
echo "Staging: $STAGING"
echo ""

# ── Phase 1: Copy source directories ────────────────────────
echo "Phase 1: Copying source directories..."

# Directories to copy as-is
for dir in app components lib store types hooks utils public; do
  echo "  -> $dir/"
  rsync -a "$ROOT_DIR/$dir/" "$STAGING/$dir/"
done

# data/ — as-is
echo "  -> data/"
rsync -a "$ROOT_DIR/data/" "$STAGING/data/"

# scripts/ — include l1/output and l2/output (sample data), exclude top-level output/
echo "  -> scripts/"
rsync -a "$ROOT_DIR/scripts/" "$STAGING/scripts/"

# sql/ — exclude exports/
echo "  -> sql/"
rsync -a --exclude='exports/' "$ROOT_DIR/sql/" "$STAGING/sql/"

# scenarios/ — as-is
echo "  -> scenarios/"
rsync -a "$ROOT_DIR/scenarios/" "$STAGING/scenarios/"

# facility-summary-mvp/ — exclude node_modules
echo "  -> facility-summary-mvp/"
rsync -a --exclude='node_modules/' "$ROOT_DIR/facility-summary-mvp/" "$STAGING/facility-summary-mvp/"

# docs/ — selective
echo "  -> docs/ (selective)"
mkdir -p "$STAGING/docs"
for f in DEPLOYMENT.md MVP-DATABASE.md FACTORY_SCENARIOS.md; do
  if [[ -f "$ROOT_DIR/docs/$f" ]]; then
    cp "$ROOT_DIR/docs/$f" "$STAGING/docs/"
  fi
done
if [[ -d "$ROOT_DIR/docs/playbook" ]]; then
  rsync -a "$ROOT_DIR/docs/playbook/" "$STAGING/docs/playbook/"
fi

# ── Phase 1.5: Verify critical runtime files exist ───────────
echo ""
echo "Phase 1.5: Verifying critical runtime files..."
MISSING=0
for critical in \
  "scripts/l1/output/sample-data.json" \
  "scripts/l2/output/sample-data.json" \
  "facility-summary-mvp/output/data-dictionary/data-dictionary.json" \
  "data/metric-library/catalogue.json"; do
  if [[ -f "$ROOT_DIR/$critical" ]]; then
    echo "  [ok] $critical"
  else
    echo "  [MISSING] $critical — metric calculations or visualizer will fail!"
    MISSING=$((MISSING + 1))
  fi
done
if [[ $MISSING -gt 0 ]]; then
  echo ""
  echo "  WARNING: $MISSING critical file(s) missing. Generate them before packaging:"
  echo "    npm run generate:l1 && npm run generate:l2   # sample data"
  echo "    npm run db:introspect                         # data dictionary"
  echo "    npm run calc:sync                             # catalogue"
  echo ""
  read -p "  Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# ── Phase 2: Copy root config files ─────────────────────────
echo ""
echo "Phase 2: Copying config files..."

for f in package.json package-lock.json tsconfig.json next.config.js \
         tailwind.config.ts postcss.config.js .eslintrc.json .gitignore \
         Dockerfile.calc-engine knip.json AGENT_README.md \
         EXCEL_TEMPLATE_CONFIG.ts \
         QUICK_START.md DASHBOARD_SETUP.md EXCEL_UPLOAD_GUIDE.md; do
  if [[ -f "$ROOT_DIR/$f" ]]; then
    cp "$ROOT_DIR/$f" "$STAGING/"
    echo "  -> $f"
  fi
done

# ── Phase 3: Security fixes ─────────────────────────────────
echo ""
echo "Phase 3: Applying security fixes..."

# Fix 1: Remove API keys from next.config.js env block (lines that leak to client JS)
echo "  [1/3] Stripping API keys from next.config.js env block"
sed 's/^.*GOOGLE_GEMINI_API_KEY.*$//' "$STAGING/next.config.js" > "$STAGING/next.config.js.tmp"
sed 's/^.*ANTHROPIC_API_KEY.*$//' "$STAGING/next.config.js.tmp" > "$STAGING/next.config.js.tmp2"
# Remove blank lines left behind (consecutive empty lines)
grep -v '^$' "$STAGING/next.config.js.tmp2" > "$STAGING/next.config.js.tmp3" || true
# Restore single blank lines between sections using awk
awk 'NR==1{print;next} /^[[:space:]]*\/\//||/^[[:space:]]*[a-zA-Z{}]/{if(prev~/^[[:space:]]*\},?$/||prev~/^[[:space:]]*\],?$/)print"";print;prev=$0;next}{print;prev=$0}' \
  "$STAGING/next.config.js.tmp3" > "$STAGING/next.config.js" 2>/dev/null || \
  cp "$STAGING/next.config.js.tmp3" "$STAGING/next.config.js"
rm -f "$STAGING/next.config.js.tmp" "$STAGING/next.config.js.tmp2" "$STAGING/next.config.js.tmp3"

# Fix 2: Sanitize error response details in lib/api-response.ts
echo "  [2/3] Sanitizing error details in lib/api-response.ts"
# Line 76: API key error — don't leak the raw message
sed "s|return { message: 'Invalid API key', details: msg, status: 401, code: 'AUTH' };|return { message: 'Invalid API key', details: 'Check server logs for details.', status: 401, code: 'AUTH' };|" \
  "$STAGING/lib/api-response.ts" > "$STAGING/lib/api-response.ts.tmp"
# Line 102: Generic PG error — don't leak raw PG message
sed "s|return { message: msg, status: 400, code: \`PG_\${pgCode}\` };|return { message: 'Database error', details: 'Check server logs.', status: 400, code: \`PG_\${pgCode}\` };|" \
  "$STAGING/lib/api-response.ts.tmp" > "$STAGING/lib/api-response.ts.tmp2"
# Line 105: Fallback error — don't leak raw exception message
sed "s|return { message: 'An unexpected error occurred', details: msg, status: 500 };|return { message: 'An unexpected error occurred', status: 500 };|" \
  "$STAGING/lib/api-response.ts.tmp2" > "$STAGING/lib/api-response.ts"
rm -f "$STAGING/lib/api-response.ts.tmp" "$STAGING/lib/api-response.ts.tmp2"

# Fix 3: Remove hardcoded macOS psql paths
echo "  [3/3] Removing hardcoded macOS psql paths"
if [[ -f "$STAGING/scripts/load-gsib-fresh.ts" ]]; then
  sed 's|/opt/homebrew/opt/postgresql@18/bin:||g' "$STAGING/scripts/load-gsib-fresh.ts" > "$STAGING/scripts/load-gsib-fresh.ts.tmp"
  sed 's|/opt/homebrew/opt/postgresql/bin:||g' "$STAGING/scripts/load-gsib-fresh.ts.tmp" > "$STAGING/scripts/load-gsib-fresh.ts"
  rm -f "$STAGING/scripts/load-gsib-fresh.ts.tmp"
fi
if [[ -f "$STAGING/scripts/load-gsib-export-resumable.sh" ]]; then
  sed 's|export PATH="/opt/homebrew/opt/postgresql@18/bin:/usr/local/bin:\$PATH"|# psql must be available on PATH|' \
    "$STAGING/scripts/load-gsib-export-resumable.sh" > "$STAGING/scripts/load-gsib-export-resumable.sh.tmp"
  mv "$STAGING/scripts/load-gsib-export-resumable.sh.tmp" "$STAGING/scripts/load-gsib-export-resumable.sh"
  chmod +x "$STAGING/scripts/load-gsib-export-resumable.sh"
fi

# ── Phase 4: Generate derived files ─────────────────────────
echo ""
echo "Phase 4: Generating derived files..."

# 4A: .env.template
echo "  -> .env.template"
cat > "$STAGING/.env.template" << 'ENVEOF'
# ============================================================
# Credit Risk Data Model Platform — Environment Configuration
# ============================================================
# Copy this file to .env and fill in your values.
# Lines starting with # are comments; uncomment to enable.
# NEVER commit .env — it contains secrets.

# --- Database (required for full functionality) --------------
DATABASE_URL=postgresql://user:pass@localhost:5432/credit_db

# --- AI Agent (optional — bring your own keys) ---------------
# Controls which LLM backend powers "Ask the Data Model".
# Options: llama (local Ollama), claude (Anthropic), gemini (Google)
AGENT_PROVIDER=llama

# Ollama (local, open-source, no API key needed)
# Install: https://ollama.com — then: ollama pull llama3.2
OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3.2

# Anthropic Claude (cloud — requires API key)
# ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini (cloud — requires API key)
# GOOGLE_GEMINI_API_KEY=...

# Password-protect the agent chat endpoint (recommended in production)
# AGENT_PASSWORD=

# --- Capital Metrics Database (optional) ---------------------
# Separate PostgreSQL instance for capital/RWA metrics development
# CAPITAL_DATABASE_URL=postgresql://user:pass@localhost:5432/capital_db

# --- Remote Calc Engine (optional) ---------------------------
# Python calc-engine on Cloud Run (enables calculators on serverless)
# CALC_ENGINE_URL=https://calc-engine-xxxxx.a.run.app

# --- Timeouts ------------------------------------------------
# SQL execution timeout for metric calculations (ms, default: 10000)
# METRIC_RUN_TIMEOUT_MS=10000

# Agent response timeout (ms, default: 180000 local, 55000 Vercel)
# AGENT_TIMEOUT_MS=180000

# --- Path Overrides (optional, rarely needed) ----------------
# Override default paths if your directory layout differs.
# DATA_MODEL_ROOT=.
# DATA_DICTIONARY_DIR=./facility-summary-mvp/output/data-dictionary
# METRICS_CUSTOM_PATH=./data/metrics-custom.json
# METRICS_EXCEL_PATH=./data/metrics_dimensions_filled.xlsx
# METRIC_LIBRARY_DIR=./data/metric-library
# MODEL_GAPS_PATH=./data/model-gaps.json
# SAMPLE_DATA_L1_PATH=./scripts/l1/output/sample-data.json
# SAMPLE_DATA_L2_PATH=./scripts/l2/output/sample-data.json
ENVEOF

# 4B: setup-db.sh
echo "  -> setup-db.sh"
cat > "$STAGING/setup-db.sh" << 'DBEOF'
#!/usr/bin/env bash
# ============================================================
# setup-db.sh — Bootstrap PostgreSQL for the Credit Risk Platform
#
# Usage:
#   ./setup-db.sh                                   # reads DATABASE_URL from .env
#   ./setup-db.sh postgresql://user:pass@host:5432/db
#   ./setup-db.sh --fresh                            # drop & recreate (idempotent)
#   ./setup-db.sh --skip-scenarios                   # DDL + seed only
#   ./setup-db.sh --skip-time-series                 # skip 20 MB weekly time-series
#   ./setup-db.sh --introspect                       # also sync data dictionary
#
# First run:  ./setup-db.sh
# Re-run:     ./setup-db.sh --fresh       (drops all tables, reloads from scratch)
# Quick seed: ./setup-db.sh --fresh --skip-time-series
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_DIR="$SCRIPT_DIR/sql/gsib-export"

SKIP_SCENARIOS=false
SKIP_TIMESERIES=false
FRESH=false
INTROSPECT=false
CONN=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-scenarios)    SKIP_SCENARIOS=true; shift;;
    --skip-time-series)  SKIP_TIMESERIES=true; shift;;
    --fresh)             FRESH=true; shift;;
    --introspect)        INTROSPECT=true; shift;;
    -h|--help)
      echo "Usage: ./setup-db.sh [DATABASE_URL] [--fresh] [--skip-scenarios] [--skip-time-series] [--introspect]"
      echo ""
      echo "  --fresh            Drop and recreate all schemas (for re-runs)"
      echo "  --skip-scenarios   Skip loading scenario data"
      echo "  --skip-time-series Skip loading 20 MB weekly time-series"
      echo "  --introspect       Run npm run db:introspect after loading"
      exit 0;;
    *) CONN="$1"; shift;;
  esac
done

# Read DATABASE_URL from .env if not passed as argument
if [[ -z "$CONN" ]]; then
  if [[ -f "$SCRIPT_DIR/.env" ]]; then
    CONN=$(grep -E '^DATABASE_URL=' "$SCRIPT_DIR/.env" | head -1 | cut -d= -f2-)
  fi
  CONN="${CONN:-${DATABASE_URL:-}}"
fi

if [[ -z "$CONN" ]]; then
  echo "Error: No database URL provided."
  echo ""
  echo "Usage: ./setup-db.sh postgresql://user:pass@host:5432/dbname"
  echo "   or: set DATABASE_URL in .env"
  exit 1
fi

# Check psql
if ! command -v psql &>/dev/null; then
  echo "Error: psql not found on PATH."
  echo ""
  echo "Install PostgreSQL client tools:"
  echo "  Ubuntu/Debian:  sudo apt install postgresql-client"
  echo "  RHEL/CentOS:    sudo yum install postgresql"
  echo "  macOS:          brew install postgresql"
  echo "  Alpine:         apk add postgresql-client"
  exit 1
fi

echo "=== Credit Risk Platform — Database Setup ==="
echo "Target: ${CONN%%@*}@***"
echo "Mode:   $([ "$FRESH" = true ] && echo "FRESH (drop + recreate)" || echo "FIRST RUN (create if not exists)")"
echo ""

if [[ "$FRESH" == "true" ]]; then
  echo "--- Dropping existing schemas (--fresh) ---"
  psql "$CONN" -c "DROP SCHEMA IF EXISTS l3 CASCADE; DROP SCHEMA IF EXISTS l2 CASCADE; DROP SCHEMA IF EXISTS l1 CASCADE;" --quiet
fi

echo "--- Creating schemas ---"
psql "$CONN" -c "CREATE SCHEMA IF NOT EXISTS l1; CREATE SCHEMA IF NOT EXISTS l2; CREATE SCHEMA IF NOT EXISTS l3;" --quiet

echo ""
echo "--- Loading DDL ---"
for f in 01-l1-ddl.sql 02-l2-ddl.sql 03-l3-ddl.sql; do
  if [[ -f "$SQL_DIR/$f" ]]; then
    echo "  -> $f"
    psql "$CONN" -f "$SQL_DIR/$f" -v ON_ERROR_STOP=1 --quiet
  fi
done

echo ""
echo "--- Loading seed data ---"
for f in 03-l1-seed.sql 03a-l1-collateral-patch.sql 04-l2-seed.sql; do
  if [[ -f "$SQL_DIR/$f" ]]; then
    echo "  -> $f"
    psql "$CONN" -f "$SQL_DIR/$f" -v ON_ERROR_STOP=1 --quiet
  fi
done

if [[ "$SKIP_SCENARIOS" == "false" ]]; then
  echo ""
  echo "--- Loading scenarios ---"
  for f in 05-scenario-seed.sql 06-factory-scenarios-v2.sql; do
    if [[ -f "$SQL_DIR/$f" ]]; then
      echo "  -> $f"
      psql "$CONN" -f "$SQL_DIR/$f" -v ON_ERROR_STOP=1 --quiet
    fi
  done
fi

if [[ "$SKIP_TIMESERIES" == "false" ]]; then
  echo ""
  echo "--- Loading time-series (this may take a minute) ---"
  if [[ -f "$SQL_DIR/07-seed-time-series.sql" ]]; then
    psql "$CONN" -f "$SQL_DIR/07-seed-time-series.sql" -v ON_ERROR_STOP=1 --quiet
    echo "  -> 07-seed-time-series.sql"
  fi
fi

echo ""
echo "--- Loading additional seed data ---"
for f in 07-gap-remediation.sql 08-payment-stress-seed.sql 09-gl-seed.sql 10-metric-test-seed.sql 11-ecl-watchlist-seed.sql; do
  if [[ -f "$SQL_DIR/$f" ]]; then
    echo "  -> $f"
    psql "$CONN" -f "$SQL_DIR/$f" -v ON_ERROR_STOP=1 --quiet
  fi
done

echo ""
echo "=== Validation ==="
echo ""
echo "Tables per schema:"
psql "$CONN" -c "SELECT schemaname, COUNT(*) AS tables FROM pg_tables WHERE schemaname IN ('l1','l2','l3') GROUP BY schemaname ORDER BY schemaname;"

echo ""
echo "Key table row counts:"
psql "$CONN" -c "
SELECT 'l1.counterparty' AS table_name, COUNT(*) AS rows FROM l1.counterparty
UNION ALL SELECT 'l1.facility_master', COUNT(*) FROM l1.facility_master
UNION ALL SELECT 'l2.facility_exposure_snapshot', COUNT(*) FROM l2.facility_exposure_snapshot
ORDER BY table_name;
"

# Auto-introspect: sync data dictionary from the new database
if [[ "$INTROSPECT" == "true" ]]; then
  echo ""
  echo "--- Syncing data dictionary (npm run db:introspect) ---"
  if command -v npm &>/dev/null; then
    cd "$SCRIPT_DIR"
    DATABASE_URL="$CONN" npm run db:introspect
    echo "  Data dictionary synced from database."
  else
    echo "  Warning: npm not found. Run 'npm run db:introspect' manually."
  fi
fi

echo ""
echo "=== Database setup complete ==="
echo ""
echo "Next: set DATABASE_URL in .env, then run 'npm run dev'"
DBEOF
chmod +x "$STAGING/setup-db.sh"

# 4C: docker-compose.yml
echo "  -> docker-compose.yml"
cat > "$STAGING/docker-compose.yml" << 'DCEOF'
# Local PostgreSQL for development/testing.
# Usage: docker-compose up -d
# Then: ./setup-db.sh postgresql://postgres:postgres@localhost:5432/credit_db
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: credit_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./sql/init-schemas.sql:/docker-entrypoint-initdb.d/01-schemas.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
DCEOF

# sql/init-schemas.sql (for Docker init)
echo "  -> sql/init-schemas.sql"
cat > "$STAGING/sql/init-schemas.sql" << 'SQLEOF'
CREATE SCHEMA IF NOT EXISTS l1;
CREATE SCHEMA IF NOT EXISTS l2;
CREATE SCHEMA IF NOT EXISTS l3;
SQLEOF

# 4D: ARCHITECTURE.md (transformed from CLAUDE.md)
echo "  -> ARCHITECTURE.md"
cp "$ROOT_DIR/CLAUDE.md" "$STAGING/ARCHITECTURE.md"

# Portable sed: write to temp then move (works on both macOS BSD and GNU sed)
_sed_i() {
  local file="$1"; shift
  sed "$@" "$file" > "$file.sedtmp" && mv "$file.sedtmp" "$file"
}

ARCH="$STAGING/ARCHITECTURE.md"

# Title
_sed_i "$ARCH" '1s/.*/# ARCHITECTURE.md — Credit Risk Data Model Platform/'

# Delete "Adding a New Metric" section up to (but not including) "Common YAML Formula Bugs"
# This removes the Claude-specific parallel worktree workflow (Phases 1-6, Parallel Safety Rules)
# but keeps the valuable bug tables and checklists
_sed_i "$ARCH" '/^## Adding a New Metric/,/^### Common YAML Formula Bugs/{/^### Common YAML Formula Bugs/!d;}'

# Promote "Common YAML Formula Bugs" to ## level since its parent section was removed
_sed_i "$ARCH" 's/^### Common YAML Formula Bugs.*/## Common YAML Formula Bugs/'

# Also promote the related subsections that follow
_sed_i "$ARCH" 's/^### PostgreSQL Seed Data Quality Checklist.*/## PostgreSQL Seed Data Quality Checklist/'
_sed_i "$ARCH" 's/^### Legacy manual workflow.*/## Legacy Manual Workflow/'
_sed_i "$ARCH" 's/^### Individual commands$/## Individual Commands/'

# Delete "Keeping This File Current" section (references doc:sync hook)
_sed_i "$ARCH" '/^## Keeping This File Current/,/^## Environment Variables/{/^## Environment Variables/!d;}'

# Delete "Auto-Sync Hook" subsection (PostToolUse hook)
_sed_i "$ARCH" '/^### Auto-Sync Hook/,/^### Capital Metrics Database/{/^### Capital Metrics Database/!d;}'

# Delete "GSIB Data Model Audit" section (references Claude skill)
_sed_i "$ARCH" '/^## GSIB Data Model Audit/,/^## Data Factory/{/^## Data Factory/!d;}'

# Strip Claude-specific references
_sed_i "$ARCH" 's|claude/<adjective-scientist>|<feature-branch-name>|g'
_sed_i "$ARCH" "s|Merge branch 'claude/\.\.\.'|Merge branch '<branch>'|g"
_sed_i "$ARCH" '/PostToolUse/d'
_sed_i "$ARCH" '/Claude Code/d'
_sed_i "$ARCH" 's|A Claude Code.*hook.*automatically runs.*||'

# 4E: README.md
echo "  -> README.md"
cat > "$STAGING/README.md" << 'READMEEOF'
# Credit Risk Data Model Platform

Banking data model visualization platform with metrics calculation engine.
Built with Next.js 14, TypeScript, Tailwind CSS, Zustand, Recharts.
PostgreSQL for production data, sql.js (in-memory SQLite) for metric demos.

## Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **PostgreSQL 15+** (optional but recommended for full functionality)

### 1. Install Dependencies

```bash
npm install
cd facility-summary-mvp && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.template .env
# Edit .env: set DATABASE_URL at minimum
```

### 3. Set Up Database

**Option A — Docker (easiest):**
```bash
docker-compose up -d
./setup-db.sh postgresql://postgres:postgres@localhost:5432/credit_db
```

**Option B — Existing PostgreSQL:**
```bash
./setup-db.sh postgresql://user:pass@host:5432/dbname
# Or set DATABASE_URL in .env and just run: ./setup-db.sh
```

**Option C — No database (limited mode):**
The app works without PostgreSQL — metric demos use in-memory sql.js.
Database status indicators will show "not connected".

### 4. Start Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Production Build

```bash
npm run build
npm start
```

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Data model visualizer (L1/L2/L3 tables, relationships) |
| `/data-elements` | Data dictionary explorer |
| `/metrics/library` | Metric catalogue (100+ banking metrics) |
| `/metrics/deep-dive` | Interactive metric calculation walkthrough |
| `/db-status` | Database reconciliation status |

## Architecture

See **ARCHITECTURE.md** for the full data model documentation, including:
- Three-layer architecture (L1 Reference, L2 Atomic, L3 Derived)
- Metric system (definitions, calculation engine, lineage)
- SQL conventions and DDL rules
- Data factory for scenario generation

## AI Agent (Optional)

The platform includes an AI-powered agent for querying the data model
("Ask the Data Model"). It requires an LLM backend:

- **Ollama** (local, free): Install from https://ollama.com
- **Anthropic Claude**: Set `ANTHROPIC_API_KEY` in `.env`
- **Google Gemini**: Set `GOOGLE_GEMINI_API_KEY` in `.env`

See `AGENT_README.md` for details and `.env.template` for configuration.

## Key npm Scripts

```bash
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run test:metrics     # Validate metric definitions
npm run test:calc-engine # Test calculation engine
npm run calc:sync        # Sync YAML metrics → catalogue + Excel
npm run db:introspect    # Sync PostgreSQL schema → data dictionary
npm run validate         # Validate cross-referential integrity
npm run validate:l1      # Validate L1 reference data quality
```

## Database Setup Details

The `setup-db.sh` script loads SQL files from `sql/gsib-export/` in order:

1. **DDL** — Table structures for L1, L2, L3 schemas
2. **L1 Seed** — Reference data (counterparties, facilities, dimensions)
3. **L2 Seed** — Atomic data (exposure snapshots, risk snapshots)
4. **Scenarios** — 38 GSIB credit risk scenarios (~16K rows)
5. **Time-series** — Weekly snapshots (~128K rows, ~20 MB)
6. **Extras** — Payment stress, GL, metric test, ECL/watchlist data

Flags:
- `--fresh` — Drop and recreate all schemas (required for re-runs)
- `--skip-scenarios` — Skip loading scenario data
- `--skip-time-series` — Skip loading 20 MB weekly time-series
- `--introspect` — Also run `npm run db:introspect` to sync data dictionary

## Network & Firewall Requirements

The platform is **firewall-friendly**. No external calls are required for core functionality.

### Required Network Access

| Endpoint | Protocol | Purpose | Required? |
|----------|----------|---------|-----------|
| PostgreSQL (Cloud SQL) | TCP 5432 | Database for all data operations | **Yes** |

### Optional Network Access (AI Agent only)

| Endpoint | Protocol | Purpose | Required? |
|----------|----------|---------|-----------|
| `api.anthropic.com` | HTTPS 443 | Claude AI agent | No — only if using Claude |
| `generativelanguage.googleapis.com` | HTTPS 443 | Gemini AI agent | No — only if using Gemini |
| Internal Ollama server | HTTP 11434 | Local LLM agent | No — only if using Ollama |

### Zero External Calls For
- **Fonts**: Self-hosted at build time (Google Fonts downloaded during `npm run build`, NOT at runtime)
- **Icons/Charts**: All libraries bundled locally (Lucide, Recharts)
- **Analytics**: None present (no Google Analytics, Sentry, etc.)
- **CDN**: All assets served locally
- **Telemetry**: None present

### Without AI Agent API Access
The platform is fully functional without any AI API access. The only feature
that requires external APIs is the "Ask the Data Model" agent chat. All other
features (visualizer, metric library, calculations, data dictionary) work
with only PostgreSQL access.

## GCP Cloud SQL Connection

### Via Cloud SQL Auth Proxy (recommended)
```bash
# Start the proxy (in a separate terminal)
cloud-sql-proxy PROJECT:REGION:INSTANCE --port=5432

# Connection string (proxy handles auth + encryption)
DATABASE_URL=postgresql://user:pass@localhost:5432/credit_db
```

### Direct Connection (private IP or public IP with SSL)
```bash
# Private IP (within same VPC)
DATABASE_URL=postgresql://user:pass@10.x.x.x:5432/credit_db

# Public IP (requires SSL)
DATABASE_URL=postgresql://user:pass@x.x.x.x:5432/credit_db?sslmode=require
```

### Connection String Format
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE[?sslmode=require]
```
The app auto-detects SSL requirements:
- `localhost` / `127.0.0.1` → SSL disabled (assumes Cloud SQL Proxy)
- `?sslmode=require` in URL → SSL enabled
- All other hosts → SSL optional (follows server config)

## Security Notes

- **API routes have no built-in authentication.** Add your own auth
  middleware before exposing to users. See `app/middleware.ts` (create it).
- Set `AGENT_PASSWORD` in `.env` to password-protect the agent endpoint.
- Never commit `.env` files containing API keys.
- The `next.config.js` does NOT expose API keys to the browser.
  Keys are only used server-side in API routes.

## File Structure Overview

```
app/                    # Next.js pages + API routes
components/             # React components (by feature)
lib/                    # Core business logic
data/                   # Metric definitions, catalogues
scripts/                # CLI tools, calc engine, data generators
sql/                    # DDL + seed data (PostgreSQL)
scenarios/              # Data factory (scenario generation)
facility-summary-mvp/   # Data dictionary assembly
store/                  # Zustand state management
types/                  # Shared TypeScript types
```
READMEEOF

# ── Phase 5: Cleanup ────────────────────────────────────────
echo ""
echo "Phase 5: Cleanup..."

# Remove OS artifacts
find "$STAGING" -name '.DS_Store' -delete 2>/dev/null || true
find "$STAGING" -name 'Thumbs.db' -delete 2>/dev/null || true

# Remove any node_modules that snuck in
find "$STAGING" -name 'node_modules' -type d -exec rm -rf {} + 2>/dev/null || true

# Remove .next build cache
rm -rf "$STAGING/.next" 2>/dev/null || true

# Remove .env if somehow copied
rm -f "$STAGING/.env" "$STAGING/.env.local" 2>/dev/null || true

# Remove Claude/Cursor/Vercel-specific files
rm -rf "$STAGING/.claude" "$STAGING/.cursor" 2>/dev/null || true
rm -f "$STAGING/.claudeignore" "$STAGING/.vercelignore" "$STAGING/.gcloudignore" 2>/dev/null || true

# Verification checks
ERRORS=0

if grep -q 'GOOGLE_GEMINI_API_KEY' "$STAGING/next.config.js"; then
  echo "  ERROR: next.config.js still contains GOOGLE_GEMINI_API_KEY"
  ERRORS=$((ERRORS + 1))
fi
if grep -q 'ANTHROPIC_API_KEY' "$STAGING/next.config.js"; then
  echo "  ERROR: next.config.js still contains ANTHROPIC_API_KEY"
  ERRORS=$((ERRORS + 1))
fi
if grep -q "details: msg, status: 500" "$STAGING/lib/api-response.ts"; then
  echo "  ERROR: api-response.ts still leaks error details on fallback"
  ERRORS=$((ERRORS + 1))
fi
if [[ -f "$STAGING/CLAUDE.md" ]]; then
  echo "  ERROR: CLAUDE.md should not be in the package"
  ERRORS=$((ERRORS + 1))
fi
if [[ ! -f "$STAGING/ARCHITECTURE.md" ]]; then
  echo "  ERROR: ARCHITECTURE.md is missing"
  ERRORS=$((ERRORS + 1))
fi

if [[ $ERRORS -gt 0 ]]; then
  echo "  $ERRORS verification error(s) found!"
  exit 1
fi
echo "  All checks passed."

# ── Phase 6: Create zip ─────────────────────────────────────
echo ""
echo "Phase 6: Creating zip..."

ZIPNAME="credit-risk-platform-$TIMESTAMP.zip"
PARENT_DIR="$(dirname "$STAGING")"
BASENAME="$(basename "$STAGING")"

(cd "$PARENT_DIR" && zip -r -q "$ZIPNAME" "$BASENAME" -x '*.DS_Store')
mv "$PARENT_DIR/$ZIPNAME" "$OUTPUT_DIR/"

# ── Phase 7: Summary ────────────────────────────────────────
ZIPPATH="$OUTPUT_DIR/$ZIPNAME"
ZIPSIZE=$(du -h "$ZIPPATH" | cut -f1)

echo ""
echo "============================================================"
echo "  Migration Package Created Successfully"
echo "============================================================"
echo ""
echo "  File: $ZIPPATH"
echo "  Size: $ZIPSIZE"
echo ""
echo "  Contents:"
echo "    Source:     app/ components/ lib/ store/ types/ hooks/ utils/"
echo "    Data:       data/ (metrics, catalogues, Excel)"
echo "    SQL:        sql/ (DDL + seed + scenarios + time-series)"
echo "    Scripts:    scripts/ (calc engine, generators, CLI tools)"
echo "    Scenarios:  scenarios/ (data factory + YAML narratives)"
echo "    Dictionary: facility-summary-mvp/"
echo "    Docs:       ARCHITECTURE.md, README.md, docs/"
echo ""
echo "  Security fixes applied:"
echo "    [x] API keys removed from next.config.js client env"
echo "    [x] Error details sanitized in lib/api-response.ts"
echo "    [x] Hardcoded macOS psql paths removed"
echo ""
echo "  Generated files:"
echo "    [x] README.md (quick start guide)"
echo "    [x] ARCHITECTURE.md (full architecture docs)"
echo "    [x] .env.template (all env vars documented)"
echo "    [x] setup-db.sh (database bootstrap)"
echo "    [x] docker-compose.yml (local PostgreSQL)"
echo ""
echo "  Excluded:"
echo "    .claude/ .git/ .next/ node_modules/ slides_screenshots/"
echo "    CLAUDE.md BUILD_PROMPT.md *.pptx dev-only markdown"
echo ""
echo "  Next steps:"
echo "    1. Transfer zip to target environment"
echo "    2. Unzip and run: npm install"
echo "    3. cd facility-summary-mvp && npm install && cd .."
echo "    4. cp .env.template .env  # configure DATABASE_URL"
echo "    5. ./setup-db.sh          # bootstrap PostgreSQL"
echo "    6. npm run dev             # start the platform"
echo ""

# Cleanup staging
rm -rf "$STAGING"
