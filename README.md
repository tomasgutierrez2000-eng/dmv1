# Data Model Visualizer

Banking data model visualization platform with metrics calculation engine. Built for GSIB (Global Systemically Important Bank) data governance and CRO dashboard scenarios.

## Tech Stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **Zustand**, **Recharts**, **sql.js**, **PostgreSQL** (optional)
- L1/L2/L3 three-layer data model (Reference → Atomic → Derived)

## Quick Start

```bash
cp .env.example .env   # Add API keys for agent; DATABASE_URL optional
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | New developer setup checklist |
| [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) | Local run, ports, Excel upload |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Path overrides, scaling, read-only deployment |
| [CLAUDE.md](CLAUDE.md) | Architecture, conventions, metric system |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test:metrics` | Validate metric definitions |
| `npm run test:calc-engine` | Test calculation engine |
| `npm run check:dead` | Dead code detection (knip) |
| `npm run sync:data-model` | Sync data dictionary |
| `npm run db:load-gsib` | Load GSIB scenario data (requires DATABASE_URL) |

## Testing

- **test:metrics**: Validates metric definitions (ids, formulas, sourceFields)
- **test:calc-engine**: Runs calculation engine against sample data
- **validate**: Data model structural validation
- No Jest/Vitest; validation via CLI scripts.
- **smoke:api**: With dev server running, `npm run smoke:api` hits `/api/schema/bundle`, `/api/metrics`, `/api/data-dictionary` to verify deployment.

## CI

GitHub Actions runs on push/PR to `main`/`master`: typecheck, lint, test:metrics, test:calc-engine, audit, sync, validate.
