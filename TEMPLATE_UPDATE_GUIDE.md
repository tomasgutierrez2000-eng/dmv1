# Template Update Guide

## How to Update Code for New Excel Template

If your Excel template has changed (new column names, different structure), follow these steps:

### Step 1: Check Current Column Mapping

The column mappings are defined in:
```
app/api/upload-excel/column-mapping.ts
```

This file contains all the possible column name patterns the parser looks for.

### Step 2: Update Column Mappings

Edit `column-mapping.ts` and update the `DEFAULT_COLUMN_MAPPING` object:

```typescript
export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  L1: {
    category: ['uni', 'category', 'table category'],  // Add your new column names here
    tableName: ['table name', 'table_name', 'table'],
    // ... etc
  },
  // ...
};
```

**Key Points:**
- Add multiple variations of column names (the parser will try all of them)
- Order matters - more specific patterns should come first
- Case-insensitive matching
- Partial matching is supported (e.g., "table name" will match "Table Name" or "Table Name Column")

### Step 3: Test Your Changes

1. Upload your new Excel template
2. Check the error messages - they will show:
   - Which columns were detected
   - Which required columns are missing
   - What the parser tried to find

### Step 4: Common Column Name Changes

#### If column names changed slightly:
Just add the new name to the array:
```typescript
tableName: ['table name', 'table_name', 'table', 'NEW_COLUMN_NAME'],
```

#### If column structure changed:
1. Check what columns are actually in your Excel
2. Update the mapping arrays to include all variations
3. The parser will automatically find the best match

#### If new columns were added:
- Optional columns (like "Notes") don't need to be in the mapping
- Required columns (like "Table Name") must be in the mapping
- The parser will skip missing optional columns

### Step 5: Diagnostic Mode

If parsing fails, the error messages will show:
```
Detected columns: Column1, Column2, Column3, ...
```

Use this to see what the parser actually found vs. what it expected.

### Example: Updating for New Template

**Old Template:**
- Column: "Table Name"

**New Template:**
- Column: "Physical Table Name"

**Update:**
```typescript
tableName: ['table name', 'table_name', 'physical table name', 'physical_table_name'],
```

The parser will now find either "Table Name" or "Physical Table Name".

### Advanced: Custom Column Mapping

If you need completely different logic, you can:

1. Create a new mapping configuration
2. Import it in `route.ts`
3. Use it instead of `DEFAULT_COLUMN_MAPPING`

```typescript
import { DEFAULT_COLUMN_MAPPING } from './column-mapping';
import { MY_CUSTOM_MAPPING } from './my-custom-mapping';

const mapping = process.env.USE_CUSTOM_MAPPING ? MY_CUSTOM_MAPPING : DEFAULT_COLUMN_MAPPING;
```

### Troubleshooting

**Error: "Required column not found"**
- Check the exact column name in your Excel
- Add it to the mapping array
- Make sure there are no extra spaces or special characters

**Error: "Detected columns: ..."**
- Compare detected columns with expected columns
- Update mapping to include the actual column names

**Columns not being parsed correctly**
- Check if column name has special characters
- Try adding variations (with/without spaces, underscores, etc.)
- Check for hidden characters or encoding issues

### Quick Reference

**File to edit:** `app/api/upload-excel/column-mapping.ts`

**What to update:** The string arrays in `DEFAULT_COLUMN_MAPPING`

**How to test:** Upload Excel file and check error messages

**Where errors appear:** In the upload results page, under "Errors" section
