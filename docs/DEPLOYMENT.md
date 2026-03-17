# Deployment

## Path and environment overrides

File I/O for the data model and metrics uses paths derived from **project root**. You can override these with environment variables so that read-only or alternate-root deployments work correctly.

| Env variable | Purpose | Default |
|--------------|---------|---------|
| `DATA_MODEL_ROOT` | Project root (all other paths fall back from this) | `process.cwd()` |
| `DATA_DICTIONARY_DIR` | Directory containing `data-dictionary.json` | `{root}/facility-summary-mvp/output/data-dictionary` |
| `METRICS_CUSTOM_PATH` | Path to `metrics-custom.json` | `{root}/data/metrics-custom.json` |
| `METRICS_EXCEL_PATH` | Path to metrics Excel file | `{root}/data/metrics_dimensions_filled.xlsx` |
| `METRIC_LIBRARY_DIR` | Directory for catalogue, domains, variants, parent-metrics JSON | `{root}/data/metric-library` |
| `MODEL_GAPS_PATH` | Path to `model-gaps.json` | `{root}/data/model-gaps.json` |
| `SAMPLE_DATA_L1_PATH` | L1 sample data JSON (for metric calculation) | `{root}/scripts/l1/output/sample-data.json` |
| `SAMPLE_DATA_L2_PATH` | L2 sample data JSON (for metric calculation) | `{root}/scripts/l2/output/sample-data.json` |
| `METRIC_RUN_TIMEOUT_MS` | Timeout in ms for in-memory metric SQL execution | `10000` |

## Read vs write requirements

- **Read-only routes** (work with read-only filesystem or pre-populated data):  
  `GET /api/data-dictionary`, `GET /api/schema/bundle`, `GET /api/data-model/model`, `GET /api/metrics`, `GET /api/metrics/values`, `GET /api/metrics/consumable`, `GET /api/sample-data/*`, and all metric library GETs. They need read access to the paths above (and, for schema, to `facility-summary-mvp/output/data-dictionary/`).

- **Write routes** (require writable filesystem):  
  `POST/PATCH/DELETE /api/data-model/*` (tables, fields, generate-ddl), `POST /api/data-model/apply-ddl` (dry run is read-only; execute writes to DB only), `POST/PUT/DELETE /api/metrics`, `POST /api/metrics/import`, `POST /api/upload-excel`, and metric library POST/PUT. If the filesystem is read-only (e.g. Vercel), these return 503 with a clear “write not available” style message.

- **PostgreSQL:** Optional. Only used when `DATABASE_URL` is set; `POST /api/data-model/apply-ddl` with `dryRun: false` executes DDL against that database. All other behaviour uses file-based or in-memory (sql.js) data.

## Agent Authentication

- **AGENT_PASSWORD**: Optional. When set, the agent chat requires the password in the request body. For production, use proper auth (session/JWT, API key, or reverse-proxy auth) and consider rate limiting to prevent token abuse.
- The agent consumes external API keys (Gemini, Claude); protect the agent endpoint in production.

## Scaling and Limits

- **sql.js**: In-memory SQL execution for metric calculations. Suitable for demo/single-tenant. Not designed for high concurrency; each calculation runs in-process.
- **PostgreSQL**: Optional. When `DATABASE_URL` is set, used for apply-ddl, metrics value store, and scenario data. Use connection pooling for production scale.
- **File I/O**: Data dictionary, metrics, catalogue are file-based. Read-heavy routes can be cached; write routes require writable filesystem.
- **Concurrent users**: Demo deployment handles moderate traffic; for production, consider CDN caching for static/schema endpoints and horizontal scaling behind a load balancer.

## Database Migrations

When deploying with `DATABASE_URL`, the following migrations must be applied in order. Each is idempotent (safe to re-run).

```bash
# Core governance tables (metric audit trail + sandbox runs)
psql "$DATABASE_URL" -f sql/migrations/011-metric-governance.sql

# Tamper-evident audit (append-only rules + schema change log table)
psql "$DATABASE_URL" -f sql/migrations/024-tamper-evident-audit.sql
```

**Verification after deployment:**
```bash
# Confirm governance tables exist
psql "$DATABASE_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'l3' AND tablename IN ('metric_change_log', 'metric_sandbox_run', 'schema_change_log') ORDER BY tablename"

# Confirm append-only rules are active
psql "$DATABASE_URL" -c "SELECT tablename, rulename FROM pg_rules WHERE schemaname = 'l3' ORDER BY tablename"
```

Expected: 3 tables, 6 rules (2 per table: no_update + no_delete).

## Summary

1. Set `DATA_MODEL_ROOT` (or specific path vars) if the app does not run with `cwd` equal to the project root.
2. For serverless/read-only: point path vars to a read-only mount or pre-bundled data; expect 503 on any route that tries to write to disk.
3. For full functionality (custom metrics, schema edits, upload): ensure the process can write to the data directory and, if using apply-ddl, set `DATABASE_URL`.
4. Apply required database migrations (see above) when deploying with PostgreSQL.
