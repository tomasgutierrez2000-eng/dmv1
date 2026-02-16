# How to Run the Excel Upload Feature

## Step 1: Install Dependencies

Open your terminal and run:

```bash
cd /Users/tomas/120
npm install
```

This will install the `xlsx` package needed to parse Excel files.

**If you get permission errors**, try:
```bash
npm install xlsx --legacy-peer-deps
```

## Step 2: Start the Development Server

In the same terminal, run:

```bash
npm run dev
```

You should see output like:
```
▲ Next.js 14.2.0
- Local:        http://localhost:3000
✓ Ready in X.Xs
```

## Step 3: Open the Upload Page

Open your web browser and go to:

```
http://localhost:3000/upload
```

## Step 4: Upload Your Excel File

1. **Prepare your Excel file:**
   - Must have sheets named exactly: `L1`, `L2`, `L3`
   - Follow the column structure from the requirements document
   - File should be `.xlsx` or `.xls` format

2. **Upload:**
   - Drag and drop your Excel file onto the upload area, OR
   - Click "Choose File" and select your file

3. **Parse:**
   - Click the "Parse Data Dictionary" button
   - Wait for processing (you'll see "Parsing..." indicator)

4. **Review Results:**
   - See statistics (table counts, field counts, relationships)
   - View all parsed tables by layer (L1, L2, L3)
   - Check derivation dependencies
   - Review any errors or warnings

## Step 5: Check Output

The parsed data dictionary is saved to:

```
facility-summary-mvp/output/data-dictionary/data-dictionary.json
```

You can view this file to see the complete parsed schema.

## Troubleshooting

### "Module not found: Can't resolve 'xlsx'"
- Make sure you ran `npm install` in Step 1
- Check that `node_modules/xlsx` exists
- Restart the dev server after installing

### "Missing required sheets: L1, L2"
- L1 and L2 sheets are required
- L3 sheet is optional
- Your Excel file must have sheets named exactly `L1`, `L2`, and `L3`
- Check the sheet names in Excel (case-sensitive)

### Server won't start
- Make sure port 3000 is not in use
- Try: `npm run dev -- -p 3001` (then use http://localhost:3001/upload)

### Permission errors during npm install
- Try: `npm install --legacy-peer-deps`
- Or: `sudo npm install` (if you have sudo access)

## Quick Start (All Commands)

```bash
# Navigate to project
cd /Users/tomas/120

# Install dependencies
npm install

# Start server
npm run dev

# Then open browser to:
# http://localhost:3000/upload
```
