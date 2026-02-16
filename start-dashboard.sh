#!/bin/bash

echo "🚀 Starting Facility Summary Dashboard..."
echo ""

# Check if data exists
if [ ! -f "facility-summary-mvp/output/l3/facility-summary.json" ]; then
    echo "❌ Data file not found. Generating data first..."
    cd facility-summary-mvp
    npm run dev
    cd ..
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🌐 Starting Next.js dev server..."
echo "📊 Dashboard will be available at: http://localhost:3000/dashboard"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
