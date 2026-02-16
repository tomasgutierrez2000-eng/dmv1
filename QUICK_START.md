# Quick Start Guide - Facility Summary Dashboard

## Step-by-Step Instructions

### ✅ Step 1: Verify Data File Exists
The data file should already exist. Let's verify:
```bash
ls facility-summary-mvp/output/l3/facility-summary.json
```
If this file doesn't exist, see "Generate Data" section below.

### ✅ Step 2: Install Dependencies
Make sure all npm packages are installed:
```bash
npm install
```
This will install:
- Next.js and React
- lucide-react (icons)
- recharts (charts - optional, dashboard works without it)
- All other dependencies

### ✅ Step 3: Start the Development Server
Start the Next.js server:
```bash
npm run dev
```

You should see output like:
```
▲ Next.js 14.2.0
- Local:        http://localhost:3000
- Ready in 2.3s
```

### ✅ Step 4: Open the Dashboard
Open your web browser and navigate to:

**http://localhost:3000/dashboard**

You should see:
- Summary cards at the top
- Filter bar
- Charts section
- Data table with facility information

---

## Alternative: Test the API First

If you want to verify the API is working before viewing the dashboard:

1. Start the server: `npm run dev`
2. Visit: **http://localhost:3000/test-api**

This page will show you if the API is working correctly.

---

## If Data File is Missing

If you need to generate the data file:

```bash
# Navigate to the facility-summary-mvp directory
cd facility-summary-mvp

# Install dependencies (if not already done)
npm install

# Generate the data
npm run dev

# This creates: output/l3/facility-summary.json
# Then go back to root and start the dashboard
cd ..
npm run dev
```

---

## Troubleshooting

### Port 3000 Already in Use?
```bash
npm run dev -- -p 3001
```
Then visit: http://localhost:3001/dashboard

### See Errors in Terminal?
- Check that `facility-summary-mvp/output/l3/facility-summary.json` exists
- Make sure you ran `npm install` in the root directory
- Check the browser console (F12) for JavaScript errors

### Dashboard Shows "Error loading data"?
1. Check the browser console (F12 → Console tab)
2. Check the terminal where `npm run dev` is running
3. Verify the data file exists and is valid JSON
4. Try the test page: http://localhost:3000/test-api

---

## What You'll See

Once running, the dashboard includes:

1. **Summary Cards** - 7 key metrics:
   - Total Facilities
   - Total Committed Amount
   - Total Outstanding Exposure
   - Average Utilization
   - Facilities with Amendments
   - Syndicated Facilities
   - Average Risk Rating

2. **Filters** - Search and filter by:
   - Facility ID, Counterparty Name
   - Status, Product, Line of Business
   - Region, Risk Rating
   - Amendments, Syndication

3. **Charts** - Visual breakdowns:
   - Exposure by Product
   - Exposure by Region
   - Exposure by Risk Rating

4. **Data Table** - Sortable, paginated table with:
   - All facility details
   - Utilization bars
   - Risk rating badges
   - Trend indicators

---

## Quick Commands Reference

```bash
# From root directory (/Users/tomas/120)

# Install dependencies
npm install

# Start dashboard server
npm run dev

# Generate data (if needed)
cd facility-summary-mvp && npm run dev && cd ..

# Check if data exists
ls facility-summary-mvp/output/l3/facility-summary.json
```
