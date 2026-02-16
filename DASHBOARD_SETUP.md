# Dashboard Setup Guide

## Step 1: Generate the Data

First, you need to generate the facility summary data:

```bash
cd facility-summary-mvp
npm install
npm run dev
```

This will create the JSON files in `facility-summary-mvp/output/l3/facility-summary.json`

## Step 2: Install Dashboard Dependencies

From the root directory (`/Users/tomas/120`):

```bash
npm install
```

This will install recharts and other dependencies.

## Step 3: Start the Next.js Server

```bash
npm run dev
```

The server should start on **http://localhost:3000**

## Step 4: Navigate to Dashboard

Open your browser and go to:

**http://localhost:3000/dashboard**

## Troubleshooting

### If you see "Failed to load facility summary data":

1. Make sure you've run the data generation step (Step 1)
2. Verify the file exists: `ls facility-summary-mvp/output/l3/facility-summary.json`
3. Check the browser console for errors
4. Check the terminal where `npm run dev` is running for API errors

### If the page doesn't load:

1. Check that the Next.js server is running (you should see "Ready" in the terminal)
2. Try accessing http://localhost:3000 first to see if the main page loads
3. Check for TypeScript compilation errors in the terminal

### If you see import errors:

Make sure all dependencies are installed:
```bash
npm install
```

### Port Already in Use:

If port 3000 is already in use:
```bash
npm run dev -- -p 3001
```

Then navigate to http://localhost:3001/dashboard
