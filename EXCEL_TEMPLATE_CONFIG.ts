/**
 * EXCEL TEMPLATE CONFIGURATION
 * 
 * INSTRUCTIONS:
 * 1. Update the column names below to match your Excel template
 * 2. Add all variations of column names (the parser will try all of them)
 * 3. Save this file
 * 4. Share this file back to update the code
 * 
 * The parser will automatically find columns matching any of the names in each array.
 * Order matters - more specific patterns should come first.
 * Matching is case-insensitive and supports partial matches.
 */

export const EXCEL_TEMPLATE_COLUMN_MAPPING = {
  /**
   * L1 SHEET COLUMNS
   * Update these to match your L1 sheet column headers
   */
  L1: {
    // Column that contains the category/grouping (e.g., "Collateral & CRM", "Metrics & Context")
    category: [
      'table category',
      'category',
      'uni',
      'table classification',
      // ADD YOUR COLUMN NAMES HERE:
      // 'your_category_column',
    ],

    // Column that contains the table name (e.g., "facility_master", "counterparty")
    tableName: [
      'table name',
      'table_name',
      'table',
      // ADD YOUR COLUMN NAMES HERE:
      // 'physical table name',
      // 'table_name_column',
    ],

    // Column that contains the field/column name (e.g., "facility_id", "counterparty_id")
    dataElement: [
      'data element',
      'data_element',
      'field',
      'column',
      'column name',
      // ADD YOUR COLUMN NAMES HERE:
      // 'field name',
      // 'column_name',
    ],

    // Column that contains the field description
    description: [
      'data element description',
      'description',
      'field description',
      'data element desc',
      // ADD YOUR COLUMN NAMES HERE:
      // 'field_description',
    ],

    // Column that contains business justification
    whyRequired: [
      'why required',
      'why_required',
      'business justification',
      'justification',
      // ADD YOUR COLUMN NAMES HERE:
      // 'why_required_column',
    ],

    // Column that contains PK/FK mapping (e.g., "PK", "FK → L1.table.field")
    pkFk: [
      'pk/fk mapping',
      'pk_fk',
      'pk_fk mapping',
      'key mapping',
      'key',
      // ADD YOUR COLUMN NAMES HERE:
      // 'primary_key_foreign_key',
    ],

    // Column that contains metric/row type (e.g. "Metric L1", "Metric L2", "Metric L3")
    type: [
      'type',
      'TYPE',
      'metric type',
      'metric type level',
      'row type',
      'layer type',
    ],

    // Column that contains the field data type (e.g. VARCHAR(64), NUMERIC(20,4), DATE)
    dataType: [
      'data type',
      'data_type',
      'type',
      'sql data type',
      'column type',
    ],
  },

  /**
   * L2 SHEET COLUMNS
   * Update these to match your L2 sheet column headers
   */
  L2: {
    // Column that contains the category/grouping
    category: [
      'table category',
      'category',
      'uni',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains the table name
    tableName: [
      'table name',
      'table_name',
      'table',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains the field/column name
    dataElement: [
      'data element',
      'data_element',
      'field',
      'column',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains the field description
    description: [
      'description',
      'data element description',
      'field description',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains business justification
    whyRequired: [
      'why required',
      'why_required',
      'business justification',
      'justification',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains PK/FK mapping
    pkFk: [
      'pk/fk mapping',
      'pk_fk',
      'pk_fk mapping',
      'key mapping',
      'key',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains simplification notes
    simplificationNote: [
      'simplification note',
      'simplification_note',
      'notes',
      'simplification',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains metric/row type (e.g. "Metric L1", "Metric L2", "Metric L3")
    type: [
      'type',
      'TYPE',
      'metric type',
      'metric type level',
      'row type',
      'layer type',
    ],

    // Column that contains the field data type (e.g. VARCHAR(64), NUMERIC(20,4), DATE)
    dataType: [
      'data type',
      'data_type',
      'sql data type',
      'column type',
    ],
  },

  /**
   * L3 SHEET COLUMNS
   * Update these to match your L3 sheet column headers
   */
  L3: {
    // Column that contains the derived category
    category: [
      'derived category',
      'category',
      'table category',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains the derived table/view name
    tableName: [
      'derived table / view',
      'derived table',
      'derived view',
      'table name',
      'table_name',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains the derived field name
    field: [
      'derived field',
      'field',
      'data element',
      'data_element',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains the data type
    dataType: [
      'data type',
      'data_type',
      'type',
      'sql data type',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains the derivation formula
    formula: [
      'derivation formula',
      'formula',
      'derivation',
      'sql formula',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains source table references
    sourceTables: [
      'source table(s)',
      'source tables',
      'source_table',
      'source_table(s)',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains source field references
    sourceFields: [
      'source field(s)',
      'source fields',
      'source_field',
      'source_field(s)',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains derivation logic in plain English
    derivationLogic: [
      'derivation logic (plain english)',
      'derivation logic',
      'description',
      'plain english',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains dashboard usage information
    dashboardUsage: [
      'dashboard usage',
      'usage',
      'dashboard_usage',
      'dashboard page',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains the record grain
    grain: [
      'grain',
      'record grain',
      'grain definition',
      // ADD YOUR COLUMN NAMES HERE:
    ],

    // Column that contains additional notes
    notes: [
      'notes',
      'additional notes',
      'note',
      // ADD YOUR COLUMN NAMES HERE:
    ],
  },
};

/**
 * EXAMPLE: If your Excel has these columns:
 * 
 * L1 Sheet:
 * - "Physical Table Name" (instead of "Table Name")
 * - "Field Name" (instead of "Data Element")
 * 
 * Update like this:
 * 
 * L1: {
 *   tableName: [
 *     'table name',           // Keep old names for backward compatibility
 *     'table_name',
 *     'physical table name',  // ADD YOUR NEW COLUMN NAME
 *   ],
 *   dataElement: [
 *     'data element',
 *     'data_element',
 *     'field name',           // ADD YOUR NEW COLUMN NAME
 *   ],
 *   // ... etc
 * }
 */
