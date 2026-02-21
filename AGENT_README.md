# Data Model Agent (Gemini)

The agent answers questions about the **data model**

## Running the app

1. **Create `.env`** in the project root (same folder as `package.json`). One line:
   ```
   GOOGLE_GEMINI_API_KEY=your_key_here
   ```
   No spaces around `=`, no quotes. Get a key at https://aistudio.google.com/apikey

2. **From the project root**, run:
   ```bash
   npm run dev
   ```
   Or `npm run dev:3001` / `npm run dev:3002` if port 3000 is in use.

3. Open **http://localhost:3000/agent** (or the port you used).

4. If you see "GOOGLE_GEMINI_API_KEY is not set": stop the server (Ctrl+C), confirm `.env` is next to `package.json`, then run `npm run dev` again from that folder. (tables, relationships, L3 metrics, lineage) using schema-only information—no row data.

## Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` to `.env` and set:
   ```bash
   GOOGLE_GEMINI_API_KEY=your_key_here
   ```

## Timeouts

- **Local:** Agent can run up to 120s. Use shorter questions if you hit timeouts.
- **Vercel:** Hobby plan limits functions to 60s; the agent stops at 55s so a response is returned before the platform kills the request. For longer runs on **Vercel Pro**, set `AGENT_TIMEOUT_MS=120000` (and ensure `maxDuration` in the route or project allows it).

## API

### POST /api/agent

**Body (single turn):**
```json
{ "message": "What tables are in L2?" }
```

**Body (multi-turn):**
```json
{
  "messages": [
    { "role": "user", "content": "What is facility_master?" },
    { "role": "model", "content": "..." },
    { "role": "user", "content": "What fields does it have?" }
  ]
}
```

**Response:**
```json
{
  "reply": "L2 contains...",
  "toolCalls": [{ "name": "get_tables_by_layer", "args": { "layer": "L2" } }]
}
```

### GET /api/schema/bundle

- Full schema: `GET /api/schema/bundle` (data dictionary + L3 tables + L3 metrics).
- Summary (for prompts): `GET /api/schema/bundle?summary=true`.

## Tools (used by the agent)

- `get_tables_by_layer` — List tables in L1, L2, or L3.
- `get_table_details` — Full table definition (fields, PK/FK, formulas).
- `get_relationships` — FK/join relationships (optional filter by table or layer).
- `get_derivation_dag` — L3 table-level dependency graph.
- `get_metrics_by_page` — L3 metrics for a dashboard page (P1–P7).
- `get_metric_details` — Single metric with formula, source fields, lineage.
- `search_tables_or_metrics` — Search by name or keyword.

All tool responses are **schema-only** (no row data).

## Model

- **gemini-2.0-flash** (configurable in `app/api/agent/route.ts`; use a [supported model ID](https://ai.google.dev/gemini-api/docs/models) if you get 404).
