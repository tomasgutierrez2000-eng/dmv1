# Vibe Coding Workshop: Data Model to Dashboards (5 Sessions)

A beginner-friendly workshop on **vibe coding** — using the data model as the foundation and building (or exploring) functionality on top, including dashboards. Sessions are designed so each builds on the previous.

---

## Overview

| Session | Focus | Outcome |
|--------|--------|---------|
| **1** | Environment setup | VS Code, terminal, Python + Node ready; repo running locally |
| **2** | Understanding the data model | L1/L2/L3, tables, relationships; use the visualizer |
| **3** | Data in motion | APIs, sample data, “see the data” in terminal/browser |
| **4** | Building on the data | How dashboards and metrics consume the model |
| **5** | Vibe coding | Add one small feature end-to-end with AI assistance |

---

## Session 1: Environment Setup (VS Code, Terminal, Python & Node)

**Goal:** Everyone can open the project in VS Code, use the terminal, and run the app (and optionally use Python for data exploration).

### 1.1 Install VS Code

- **Download:** [https://code.visualstudio.com/](https://code.visualstudio.com/)
- **Install** (accept defaults; “Add to PATH” on Windows if offered).
- **Open VS Code** and confirm it launches.

### 1.2 Terminal basics

- **Open terminal in VS Code:** `` Ctrl+` `` (Windows/Linux) or `` Cmd+` `` (Mac), or **Terminal → New Terminal**.
- **Concepts to show:**
  - Current directory: `pwd` (Mac/Linux) or `cd` (Windows).
  - List files: `ls` (Mac/Linux) or `dir` (Windows).
  - Change directory: `cd path/to/folder`.
  - Run a command: e.g. `node --version`, `python --version`.
- **Optional:** Brief mention of PowerShell vs Command Prompt vs bash/zsh so people know what they’re using.

### 1.3 Install Python (for data exploration and scripting)

- **Download:** [https://www.python.org/downloads/](https://www.python.org/downloads/) — use the latest 3.x.
- **Install:** Check **“Add Python to PATH”** (critical on Windows).
- **Verify in terminal:**
  ```bash
  python --version
  # or on some systems:
  python3 --version
  ```
- **Install libraries (in terminal):**
  ```bash
  pip install requests pandas
  # or:
  pip3 install requests pandas
  ```
- **Optional:** Introduce virtual environments so they’re not confused later:
  ```bash
  python -m venv venv
  # Activate: Windows: venv\Scripts\activate   Mac/Linux: source venv/bin/activate
  pip install requests pandas
  ```

### 1.4 Install Node.js (to run this app)

- **Download:** [https://nodejs.org/](https://nodejs.org/) — LTS version.
- **Verify:**
  ```bash
  node --version
  npm --version
  ```

### 1.5 Clone the repo and run the app

- **Clone** (or download) the workshop repo into a folder, e.g. `120`.
- **In terminal**, from the project root:
  ```bash
  cd /path/to/120
  npm install
  npm run dev
  ```
- **Open in browser:** [http://localhost:3000](http://localhost:3000).
- **Check:** Home/overview page loads; no red errors in terminal.

### 1.6 Optional: “Hello” from Python (confidence builder)

- In VS Code, create `scripts/hello_data.py` (or any file).
- Paste:
  ```python
  import requests
  r = requests.get("http://localhost:3000/api/facility-summary")
  print(r.status_code)
  print(len(r.json()) if r.ok else r.text[:200])
  ```
- Run: `python scripts/hello_data.py` (with the app running). They should see `200` and a number of records — “data is there.”

### Session 1 checklist

- [ ] VS Code installed and opens.
- [ ] Terminal opens inside VS Code.
- [ ] `python --version` and `pip install requests pandas` work.
- [ ] `node --version` and `npm --version` work.
- [ ] `npm install` and `npm run dev` run without errors.
- [ ] [http://localhost:3000](http://localhost:3000) loads.
- [ ] (Optional) Python script fetches `/api/facility-summary` successfully.

---

## Session 2: Understanding the Data Model

**Goal:** Explain L1/L2/L3, tables, fields, and relationships; use the Data Model Visualizer so the model is concrete, not abstract.

### 2.1 Why a data model matters

- **One sentence:** The data model is the single source of truth for what data exists and how it connects; dashboards and metrics are built on top of it.
- **Credit risk context (if relevant):** Facilities, counterparties, exposures, ratings — the platform turns scattered sources into a governed, traceable layer.

### 2.2 The three layers (L1, L2, L3)

- **L1 — Reference data:** “Contact book” — entities and attributes that change slowly (e.g. facility master, counterparties).
- **L2 — Snapshots & events:** “Bank statements” — point-in-time and event data (e.g. exposure snapshots, amendments).
- **L3 — Analytics & reporting:** “Executive summary” — derived tables and metrics (e.g. facility summary, KPIs) used by dashboards.

Use the **Guide** in the app (`/guide`) — section “The Data Layer System” — as the reference.

### 2.3 Hands-on: Data Model Visualizer

- **Open:** [http://localhost:3000/visualizer](http://localhost:3000/visualizer).
- **Do together:**
  - Toggle layers (L1 / L2 / L3) on and off.
  - Click a table; read fields (names, types, PK/FK).
  - Follow a relationship line from one table to another.
  - Search for a table (e.g. “facility”).
- **Point out:** Tables have keys (e.g. `L1.facility_master`); fields describe columns; relationships show how tables join.

### 2.4 One path from raw to dashboard

- **Narrative:** L1 has “facility master” and related reference data → L2 has snapshots (e.g. exposure by date) → L3 has a “facility summary” (one row per facility, aggregated) → the **Facility Dashboard** reads that L3 data via `/api/facility-summary`.

### Session 2 checklist

- [ ] Can explain L1 vs L2 vs L3 in one sentence each.
- [ ] Used the visualizer to open a table and follow a relationship.
- [ ] Can name at least one L3 table that feeds the dashboard.

---

## Session 3: Data in Motion — APIs and “Seeing” the Data

**Goal:** See where the data actually lives (files, APIs) and inspect it in the terminal or browser.

### 3.1 Where the data lives in this project

- **L3 facility summary:** The dashboard reads from **`/api/facility-summary`**, which serves the file `facility-summary-mvp/output/l3/facility-summary.json`.
- **Data model definition:** Tables/fields/relationships come from the **data model** (e.g. API or config the visualizer uses). The **Excel upload** can define or extend that model.

### 3.2 Call the API from the terminal

- **Browser:** Open [http://localhost:3000/api/facility-summary](http://localhost:3000/api/facility-summary). See raw JSON.
- **Terminal (curl):**
  ```bash
  curl -s http://localhost:3000/api/facility-summary | head -c 500
  ```
- **Python (optional):**
  ```python
  import requests
  import json
  r = requests.get("http://localhost:3000/api/facility-summary")
  data = r.json()
  print(json.dumps(data[0], indent=2))  # first record
  print("Total facilities:", len(data))
  ```

### 3.3 Other APIs to mention

- **Data model:** e.g. `/api/data-model/model` (or equivalent in your app) — returns tables, relationships.
- **Metrics:** e.g. `/api/metrics/...` — metric definitions and values.
- **Test page:** If the app has a “Test API” or “API Playground” page, use it to click through a few endpoints.

### 3.4 Optional: Inspect the JSON file

- In VS Code, open `facility-summary-mvp/output/l3/facility-summary.json` (if present).
- Show: array of objects; each object = one facility row; keys = columns the dashboard uses (e.g. `committed_amount_usd`, `utilization_pct`).

### Session 3 checklist

- [ ] Opened `/api/facility-summary` in browser and saw JSON.
- [ ] Ran `curl` or a Python script and got the same data.
- [ ] Can name the file on disk that backs this API (or say “API reads from L3 output”).

---

## Session 4: Building on the Data — Dashboards and Metrics

**Goal:** See how the data model and L3 data are used by the UI: filters, summary cards, tables, charts.

### 4.1 Dashboard at a glance

- **Open:** The page that shows the Facility Dashboard (e.g. via Overview → “Facility summary” walkthrough, or the data-model layout that uses `DashboardWrapper`).
- **Identify on screen:**
  - **Summary cards:** Totals/averages (e.g. total facilities, total committed, avg utilization) — all computed from the same facility-summary data.
  - **Charts:** E.g. utilization distribution, exposure by segment — same data, different aggregations.
  - **Table:** Rows = facilities; columns = fields from the model; sortable/filterable.
  - **Filters:** e.g. by portfolio, risk rating — filter the same dataset.

### 4.2 “Data → component” in code (conceptual)

- **One sentence:** The page fetches `/api/facility-summary` once; the response is passed into `SummaryCards`, `ChartsSection`, and `DashboardTable`; each component uses the fields it needs (e.g. `committed_amount_usd`, `utilization_pct`).
- **Show in VS Code (high level):**
  - Where the dashboard layout lives (e.g. `app/data-model/layout.tsx` using `DashboardWrapper`).
  - One component, e.g. `components/dashboard/SummaryCards.tsx`: “It receives `data` and computes totals/averages from it.”
- No need to write code yet — just “this component = this part of the screen; this prop = the API data.”

### 4.3 Metrics and the data model

- **Concept:** Metrics (e.g. DSCR, exposure rollups) are defined on top of the model — they reference L2/L3 tables and fields. The **Metric Library** and **Metrics Deep Dive** let you explore definitions and run calculations.
- **Optional:** Open Metric Library or a lineage view; point out “this metric comes from these tables/fields.”

### Session 4 checklist

- [ ] Can point to summary cards, charts, table, and filters on the dashboard.
- [ ] Can say “the dashboard gets its data from one API and passes it to several components.”
- [ ] (Optional) Opened the Metric Library or a metric view and saw the link to tables/fields.

---

## Session 5: Vibe Coding — Add One Feature End-to-End

**Goal:** Use AI-assisted coding (Cursor/Copilot/chat) to add one small feature that uses the existing data model and dashboard data. Emphasize: describe intent, iterate with the AI, run and test.

### 5.1 What “vibe coding” means here

- **Idea:** You describe what you want in plain language; the AI suggests code; you run it, look at the result, and refine (prompts or edits). The data model and APIs stay the same — we only add or change UI or a small API tweak.

### 5.2 Pick one small feature (examples)

Choose one and do it together, or let participants choose:

- **A. New summary card:** “Add a card that shows the count of facilities with utilization &gt; 80%,” using the existing `data` and `SummaryCards` (or a new card component).
- **B. New filter:** “Add a filter for ‘has amendment’ (or another boolean in the data)” and wire it so the table and charts respect it.
- **C. New chart:** “Add a simple bar chart of facility count by internal risk rating” using the same facility-summary data.
- **D. New column in table:** “Add a column that shows exposure change (e.g. up/down/neutral) as a badge or icon,” reusing existing fields.

### 5.3 Step-by-step flow (for the chosen feature)

1. **Describe the feature** in one or two sentences (e.g. “Show number of facilities with utilization above 80% in a new card”).
2. **Locate the right place** (e.g. “Summary cards live in `SummaryCards.tsx`; data is the same array we use for the table”).
3. **Prompt the AI:** e.g. “In SummaryCards, add a new card that counts facilities where utilization_pct &gt; 0.8 and display it as ‘High utilization facilities’.”
4. **Apply the change** (paste or accept the AI suggestion).
5. **Run the app** (`npm run dev`) and **check the dashboard** — does the new card appear and show a number?
6. **Iterate:** If the label is wrong, the threshold is wrong, or the card is in the wrong order, ask the AI to adjust or edit by hand.

### 5.4 What to stress

- **Data model unchanged:** We didn’t add new tables or APIs; we only used existing data in a new way.
- **Same data, new view:** Dashboards are “views” on the same L3 (or L2) data; new cards/filters/charts are just new views.
- **Safe to experiment:** If something breaks, we can revert the file or the block we added.

### Session 5 checklist

- [ ] Described the feature in plain language.
- [ ] Used AI to generate or modify code in one component (or one API).
- [ ] Ran the app and confirmed the new behavior.
- [ ] (Optional) Refined the feature with a second prompt or small edit.

---

## After the Workshop

- **Slack/Teams channel:** Share the doc and a link to the repo; encourage “I tried adding X and it worked / broke.”
- **Next steps (suggested):**
  - Try another small feature (different card, filter, or chart).
  - Change a label or threshold and re-run.
  - Open the Data Model Visualizer and trace one table used by the dashboard back to L1/L2.
  - Use Python to dump `/api/facility-summary` to CSV and open in Excel/Sheets.

---

## Appendix: Quick reference

- **App (local):** `npm run dev` → [http://localhost:3000](http://localhost:3000)
- **Key routes:** `/` or `/overview`, `/visualizer`, `/guide`, `/data-model` (with dashboard), `/metrics`, `/upload`, `/agent`
- **Key API:** `GET /api/facility-summary` → JSON array of facility records
- **Data model:** L1 (reference) → L2 (snapshots) → L3 (analytics); Facility Dashboard uses L3 facility summary
- **Dashboard components:** `DashboardWrapper`, `SummaryCards`, `ChartsSection`, `DashboardTable`, `FiltersBar` in `components/dashboard/`
