# Local Development

Consolidated guide for running the Data Model Visualizer locally.

## Quick Start

```bash
# 1. Clone the repo and navigate to project root
cd /path/to/120

# 2. Copy environment template and fill required vars
cp .env.example .env
# Edit .env: add GOOGLE_GEMINI_API_KEY or ANTHROPIC_API_KEY for the agent; DATABASE_URL for PostgreSQL features

# 3. Install dependencies
npm ci

# 4. Start dev server
npm run dev
```

Open `http://localhost:3000` (or the port shown in the terminal).

## Ports

- Default: `npm run dev` uses port 3000
- Alternatives: `npm run dev:3001`, `npm run dev:3002`, or `npx next dev -p 8765`
- If a port is in use, Next.js will try the next available port

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Home / overview |
| `/visualizer` | Data model schema visualization |
| `/upload` | Excel upload for data dictionary |
| `/agent` | AI agent (Ask the data model) |
| `/metrics/library` | Metric catalogue |
| `/dashboard` | Facility summary dashboard |

## Excel Upload

See [EXCEL_UPLOAD_GUIDE.md](../EXCEL_UPLOAD_GUIDE.md) for Excel template and column structure.

1. Start dev server: `npm run dev`
2. Open `http://localhost:3000/upload`
3. Upload Excel with L1, L2, (optional L3) sheets
4. Click "Parse Data Dictionary"
5. Output: `facility-summary-mvp/output/data-dictionary/data-dictionary.json`

## Agent (Ask the Data Model)

- Requires `GOOGLE_GEMINI_API_KEY` or `ANTHROPIC_API_KEY` in `.env`
- Or use local Ollama: set `AGENT_PROVIDER=llama` and `OLLAMA_BASE_URL=http://localhost:11434`
- Restart dev server after changing `.env`

## Optional: Load GSIB Data

If `DATABASE_URL` is set in `.env`:

```bash
npm run db:load-gsib
```

## Run CI Locally

```bash
npm run typecheck
npm run lint
npm run test:metrics
npm run test:calc-engine
```
