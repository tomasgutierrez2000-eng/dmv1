# Excel Upload Guide

## How to Upload Excel Files

### Step 1: Install Dependencies

```bash
cd /Users/tomas/120
npm install
```

This will install the `xlsx` library needed to parse Excel files.

### Step 2: Prepare Your Excel File

Your Excel file should follow this structure:

#### File Structure
- **One sheet per table** - Each sheet name should match a table name
- **First row = Headers** - Column names matching the schema field names
- **Subsequent rows = Data** - One row per record

#### Sheet Naming
Sheet names should match table names (case-insensitive, spaces become underscores):

**L1 Tables:**
- `facility_master`
- `counterparty`
- `counterparty_hierarchy`
- `legal_entity`
- `facility_counterparty_participation`
- `fr2590_category_dim`
- `industry_dim`

**L2 Tables:**
- `facility_exposure_snapshot`
- `collateral_snapshot`
- `amendment_event`
- `amendment_change_detail`
- `facility_pricing_snapshot`
- `facility_delinquency_snapshot`
- `facility_profitability_snapshot`
- `risk_flag`
- `counterparty_rating_observation`
- `limit_definition`
- `limit_utilization_event`
- `financial_metric_observation`

**L3 Tables:**
- `facility_summary`
- `desk_summary`
- `lob_l2_summary`
- `lob_l1_summary`

### Step 3: Upload

1. Navigate to: **http://localhost:3000/upload**
2. Drag and drop your Excel file or click "Choose File"
3. Click "Upload & Process"
4. Review the results showing which sheets were processed and how many records were imported

### Step 4: Verify

After upload, check the output directory:
```bash
ls facility-summary-mvp/output/l1/
ls facility-summary-mvp/output/l2/
ls facility-summary-mvp/output/l3/
```

The uploaded data will be saved as JSON files matching the sheet names.

## Excel File Example

### Sheet: `facility_master`

| facility_id | credit_agreement_id | counterparty_id | facility_type | product_id | ... |
|-------------|---------------------|-----------------|---------------|------------|-----|
| FAC-001 | CA-001 | CP-001 | Revolving Credit Facility | Loans | ... |
| FAC-002 | CA-002 | CP-002 | Bilateral Term Loan | Loans | ... |

### Sheet: `counterparty`

| counterparty_id | legal_name | counterparty_type | internal_risk_rating | ... |
|-----------------|------------|-------------------|---------------------|-----|
| CP-001 | Acme Corp | CORPORATE | 2 | ... |
| CP-002 | Beta Inc | CORPORATE | 3 | ... |

## Important Notes

1. **Column Names**: Must match the schema field names exactly (case-sensitive)
2. **Data Types**: The system will preserve Excel data types (numbers, dates, text)
3. **Null Values**: Empty cells will be converted to `null` in JSON
4. **Multiple Sheets**: You can include multiple tables in one Excel file
5. **Partial Uploads**: You don't need to include all tables - only upload the ones you want to update

## Troubleshooting

- **"Sheet does not match expected table name"**: Check that sheet names match the expected table names
- **"No valid data rows"**: Ensure your sheet has at least one data row (beyond headers)
- **Missing columns**: All columns in your Excel will be included, but missing columns won't cause errors

## Best Practices

1. **Start with a template**: Export existing JSON files to Excel to see the format
2. **Validate data**: Check your Excel data matches the schema before uploading
3. **Backup first**: The upload will overwrite existing JSON files
4. **Test with small files**: Upload a few rows first to verify the format
