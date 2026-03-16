# Onboarding Checklist

For new developers or teams cloning the Data Model Visualizer.

## 1. Clone the Repository

```bash
git clone <repo-url>
cd 120
```

## 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_GEMINI_API_KEY` | For agent | Gemini API for Ask the Model |
| `ANTHROPIC_API_KEY` | For agent | Claude API alternative |
| `DATABASE_URL` | Optional | PostgreSQL for apply-ddl, metrics store, scenarios |
| `AGENT_PASSWORD` | Optional | Password-protect agent chat |

See `.env.example` for full list.

## 3. Install Dependencies

```bash
npm ci
```

Use `npm ci` (not `npm install`) for reproducible installs matching `package-lock.json`.

## 4. Start Development Server

```bash
npm run dev
```

Open `http://localhost:3000` (or the port shown).

## 5. Optional: Load GSIB Data

If using PostgreSQL (`DATABASE_URL` set):

```bash
npm run db:load-gsib
```

## 6. Verify Setup

Run the same checks as CI:

```bash
npm run typecheck
npm run lint
npm run test:metrics
npm run test:calc-engine
```

## 7. Documentation

- [docs/LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) — Local run, ports, Excel upload
- [docs/DEPLOYMENT.md](DEPLOYMENT.md) — Path overrides, read-only deployment
- [CLAUDE.md](../CLAUDE.md) — Project conventions, architecture, metric system
