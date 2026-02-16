# Facility Summary MVP - Dashboard

This project generates sample credit risk data and provides a dashboard to visualize facility summaries.

## Quick Start

### 1. Generate Data

```bash
cd facility-summary-mvp
npm install
npm run dev
```

This will generate all L1, L2, and L3 JSON files in the `output/` directory.

### 2. View Dashboard

The dashboard is available at: **http://localhost:3000/dashboard**

Or navigate from the main Next.js app.

## Dashboard Features

- **Summary Cards**: Key metrics including total facilities, committed amounts, outstanding exposure, utilization rates, and more
- **Interactive Filters**: Filter by status, product, line of business, region, risk rating, amendments, and syndication
- **Data Visualizations**: Bar charts showing exposure distribution by product, region, and risk rating
- **Sortable Table**: Full facility details with sorting, pagination, and trend indicators
- **Real-time Search**: Search by facility ID, counterparty name, or credit agreement ID

## Project Structure

```
facility-summary-mvp/
├── src/
│   ├── schemas/          # TypeScript interfaces for all tables
│   ├── generators/        # Data generation logic
│   ├── assembly/         # L3 facility_summary assembly
│   ├── config/           # Reference data
│   └── index.ts          # Main orchestrator
├── output/               # Generated JSON files
│   ├── l1/              # Source tables (L1 layer)
│   ├── l2/              # Snapshot/event tables (L2 layer)
│   └── l3/              # Facility summary (L3 layer)
└── package.json
```

## Data Volumes

- 30 counterparties
- 50 facilities
- 150 exposure snapshots (3 months × 50 facilities)
- 60 collateral snapshots
- 20 amendment events
- 50 facility summaries (L3 output)

## Next Steps

1. Run data generation: `cd facility-summary-mvp && npm run dev`
2. Start Next.js dev server: `npm run dev` (from root)
3. Navigate to `/dashboard` to view the visualization
