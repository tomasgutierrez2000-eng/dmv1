/**
 * L1 Reference Data Quality Validation
 *
 * Validates L1 reference/dimension tables in PostgreSQL against GSIB data model
 * rules. Checks structural integrity, completeness, and consistency of reference
 * data that all L2/L3 tables depend on.
 *
 * Usage:
 *   npm run validate:l1
 *   npx tsx scripts/validate-l1-data-quality.ts
 *
 * Requires: DATABASE_URL in .env (or parent .env), pg package
 */
import 'dotenv/config';
import pg from 'pg';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

interface CheckResult {
  id: string;
  name: string;
  severity: Severity;
  passed: boolean;
  detail: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANSI colour helpers (no dependency)
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

function severityColor(s: Severity): string {
  switch (s) {
    case 'CRITICAL': return C.red;
    case 'HIGH': return C.yellow;
    case 'MEDIUM': return C.cyan;
  }
}

function severityLabel(s: Severity): string {
  switch (s) {
    case 'CRITICAL': return 'failure';
    case 'HIGH': return 'warning';
    case 'MEDIUM': return 'info';
  }
}

function check(
  id: string,
  name: string,
  severity: Severity,
  passed: boolean,
  detail: string,
): CheckResult {
  return { id, name, severity, passed, detail };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: safe table existence check
// ═══════════════════════════════════════════════════════════════════════════

async function tableExists(client: pg.Client, schema: string, table: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = $2 AND table_type = 'BASE TABLE'`,
    [schema, table],
  );
  return res.rowCount !== null && res.rowCount > 0;
}

async function columnExists(client: pg.Client, schema: string, table: string, column: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`,
    [schema, table, column],
  );
  return res.rowCount !== null && res.rowCount > 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation checks
// ═══════════════════════════════════════════════════════════════════════════

async function runChecks(client: pg.Client): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // ─────────────────────────────────────────────────────────────────────
  // CRITICAL #1: EBT Root Integrity
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'enterprise_business_taxonomy')) {
    const hasParentCol = await columnExists(client, 'l1', 'enterprise_business_taxonomy', 'parent_segment_id');
    if (hasParentCol) {
      const rootQ = await client.query(`
        SELECT COUNT(*) AS cnt
        FROM l1.enterprise_business_taxonomy
        WHERE parent_segment_id IS NULL
      `);
      const rootCount = Number(rootQ.rows[0].cnt);

      if (rootCount === 0) {
        results.push(check('C1', 'EBT Root Integrity', 'CRITICAL', false,
          'No root node found (parent_segment_id IS NULL). EBT hierarchy has no root.'));
      } else {
        // Check for cycles: a root should not appear as its own descendant
        const cycleQ = await client.query(`
          WITH RECURSIVE chain AS (
            SELECT managed_segment_id, parent_segment_id, 1 AS depth
            FROM l1.enterprise_business_taxonomy
            WHERE parent_segment_id IS NULL
            UNION ALL
            SELECT ebt.managed_segment_id, ebt.parent_segment_id, c.depth + 1
            FROM l1.enterprise_business_taxonomy ebt
            JOIN chain c ON ebt.parent_segment_id = c.managed_segment_id
            WHERE c.depth < 50
          )
          SELECT COUNT(*) AS total_nodes FROM chain
        `);
        const totalEbtQ = await client.query(`SELECT COUNT(*) AS cnt FROM l1.enterprise_business_taxonomy`);
        const totalNodes = Number(cycleQ.rows[0].total_nodes);
        const totalEbt = Number(totalEbtQ.rows[0].cnt);

        if (totalNodes < totalEbt) {
          results.push(check('C1', 'EBT Root Integrity', 'CRITICAL', false,
            `Circular or orphaned nodes detected: recursive traversal reached ${totalNodes} of ${totalEbt} nodes. ` +
            `${totalEbt - totalNodes} nodes are unreachable from root.`));
        } else {
          results.push(check('C1', 'EBT Root Integrity', 'CRITICAL', true,
            `Root node exists (${rootCount} root(s)), all ${totalEbt} nodes reachable from root.`));
        }
      }
    } else {
      results.push(check('C1', 'EBT Root Integrity', 'CRITICAL', false,
        'Column parent_segment_id not found in enterprise_business_taxonomy.'));
    }
  } else {
    results.push(check('C1', 'EBT Root Integrity', 'CRITICAL', false,
      'Table l1.enterprise_business_taxonomy does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // CRITICAL #2: EBT Facility Leaf Assignment
  // facility_master lives in l2 schema; EBT is in l1
  // ─────────────────────────────────────────────────────────────────────
  if (
    await tableExists(client, 'l1', 'enterprise_business_taxonomy') &&
    await tableExists(client, 'l2', 'facility_master') &&
    await columnExists(client, 'l2', 'facility_master', 'lob_segment_id')
  ) {
    const nonLeafQ = await client.query(`
      SELECT COUNT(*) AS cnt
      FROM l2.facility_master fm
      JOIN l1.enterprise_business_taxonomy ebt
        ON ebt.managed_segment_id = fm.lob_segment_id
      WHERE EXISTS (
        SELECT 1 FROM l1.enterprise_business_taxonomy child
        WHERE child.parent_segment_id = ebt.managed_segment_id
      )
    `);
    const nonLeafCount = Number(nonLeafQ.rows[0].cnt);
    if (nonLeafCount > 0) {
      results.push(check('C2', 'EBT Facility Leaf Assignment', 'CRITICAL', false,
        `${nonLeafCount} facilities point to non-leaf EBT nodes (nodes that have children). ` +
        `Facilities must be assigned to leaf nodes only.`));
    } else {
      results.push(check('C2', 'EBT Facility Leaf Assignment', 'CRITICAL', true,
        'All facilities point to leaf EBT nodes (no children).'));
    }
  } else {
    results.push(check('C2', 'EBT Facility Leaf Assignment', 'CRITICAL', false,
      'Required tables/columns for EBT leaf check not found (l2.facility_master.lob_segment_id, l1.enterprise_business_taxonomy).'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // CRITICAL #3: Agreement-Facility Counterparty Alignment
  // Both facility_master and credit_agreement_master are in l2 schema
  // ─────────────────────────────────────────────────────────────────────
  if (
    await tableExists(client, 'l2', 'facility_master') &&
    await tableExists(client, 'l2', 'credit_agreement_master')
  ) {
    const misalignQ = await client.query(`
      SELECT COUNT(*) AS cnt
      FROM l2.facility_master fm
      JOIN l2.credit_agreement_master ca
        ON fm.credit_agreement_id = ca.credit_agreement_id
      WHERE fm.counterparty_id <> ca.borrower_counterparty_id
    `);
    const misalignCount = Number(misalignQ.rows[0].cnt);
    if (misalignCount > 0) {
      // Get a few examples
      const examplesQ = await client.query(`
        SELECT fm.facility_id, fm.counterparty_id AS fac_cp,
               ca.borrower_counterparty_id AS agr_cp, ca.credit_agreement_id
        FROM l2.facility_master fm
        JOIN l2.credit_agreement_master ca
          ON fm.credit_agreement_id = ca.credit_agreement_id
        WHERE fm.counterparty_id <> ca.borrower_counterparty_id
        LIMIT 5
      `);
      const examples = examplesQ.rows.map(
        (r: { facility_id: number; fac_cp: number; agr_cp: number; credit_agreement_id: number }) =>
          `facility ${r.facility_id}: fac_cp=${r.fac_cp}, agr_cp=${r.agr_cp}, agr=${r.credit_agreement_id}`
      ).join('; ');
      results.push(check('C3', 'Agreement-Facility CP Alignment', 'CRITICAL', false,
        `${misalignCount} facilities have counterparty_id mismatched with agreement.borrower_counterparty_id. ` +
        `Examples: ${examples}`));
    } else {
      results.push(check('C3', 'Agreement-Facility CP Alignment', 'CRITICAL', true,
        'All facility counterparty_ids match their agreement borrower_counterparty_id.'));
    }
  } else {
    results.push(check('C3', 'Agreement-Facility CP Alignment', 'CRITICAL', false,
      'Required tables not found (l2.facility_master, l2.credit_agreement_master).'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // CRITICAL #4: Ceased Benchmark Check
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'interest_rate_index_dim')) {
    const hasCessation = await columnExists(client, 'l1', 'interest_rate_index_dim', 'cessation_date');
    const hasActive = await columnExists(client, 'l1', 'interest_rate_index_dim', 'is_active_flag');
    if (hasCessation && hasActive) {
      const ceasedQ = await client.query(`
        SELECT COUNT(*) AS cnt
        FROM l1.interest_rate_index_dim
        WHERE cessation_date < CURRENT_DATE
          AND is_active_flag = TRUE
      `);
      const ceasedCount = Number(ceasedQ.rows[0].cnt);
      if (ceasedCount > 0) {
        const exQ = await client.query(`
          SELECT index_name, cessation_date
          FROM l1.interest_rate_index_dim
          WHERE cessation_date < CURRENT_DATE AND is_active_flag = TRUE
          LIMIT 5
        `);
        const names = exQ.rows.map((r: { index_name: string; cessation_date: string }) =>
          `${r.index_name} (ceased ${r.cessation_date})`).join(', ');
        results.push(check('C4', 'Ceased Benchmark Check', 'CRITICAL', false,
          `${ceasedCount} ceased rate indexes still marked active: ${names}`));
      } else {
        results.push(check('C4', 'Ceased Benchmark Check', 'CRITICAL', true,
          'All ceased benchmarks (cessation_date < NOW) have is_active_flag = FALSE.'));
      }
    } else {
      results.push(check('C4', 'Ceased Benchmark Check', 'CRITICAL', false,
        'Columns cessation_date and/or is_active_flag missing from interest_rate_index_dim.'));
    }
  } else {
    results.push(check('C4', 'Ceased Benchmark Check', 'CRITICAL', false,
      'Table l1.interest_rate_index_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // CRITICAL #5: Guarantee CCF
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'exposure_type_dim')) {
    const hasCcf = await columnExists(client, 'l1', 'exposure_type_dim', 'ccf_pct');
    const hasCode = await columnExists(client, 'l1', 'exposure_type_dim', 'exposure_type_code');
    if (hasCcf && hasCode) {
      const guarQ = await client.query(`
        SELECT exposure_type_code, ccf_pct
        FROM l1.exposure_type_dim
        WHERE exposure_type_code IN ('GUAR', 'SBLC')
          AND (ccf_pct IS NULL OR ccf_pct <> 100)
      `);
      if (guarQ.rowCount && guarQ.rowCount > 0) {
        const wrongCcf = guarQ.rows.map((r: { exposure_type_code: string; ccf_pct: number | null }) =>
          `${r.exposure_type_code}=${r.ccf_pct ?? 'NULL'}`).join(', ');
        results.push(check('C5', 'Guarantee CCF', 'CRITICAL', false,
          `GUAR/SBLC exposure types must have ccf_pct=100. Found: ${wrongCcf}`));
      } else {
        // Also verify they exist at all
        const existQ = await client.query(`
          SELECT exposure_type_code FROM l1.exposure_type_dim
          WHERE exposure_type_code IN ('GUAR', 'SBLC')
        `);
        const foundCodes = existQ.rows.map((r: { exposure_type_code: string }) => r.exposure_type_code);
        const missing = ['GUAR', 'SBLC'].filter(c => !foundCodes.includes(c));
        if (missing.length > 0) {
          results.push(check('C5', 'Guarantee CCF', 'CRITICAL', false,
            `Exposure type codes missing from exposure_type_dim: ${missing.join(', ')}`));
        } else {
          results.push(check('C5', 'Guarantee CCF', 'CRITICAL', true,
            'GUAR and SBLC exposure types have ccf_pct = 100.'));
        }
      }
    } else {
      results.push(check('C5', 'Guarantee CCF', 'CRITICAL', false,
        'Columns exposure_type_code and/or ccf_pct missing from exposure_type_dim.'));
    }
  } else {
    results.push(check('C5', 'Guarantee CCF', 'CRITICAL', false,
      'Table l1.exposure_type_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // HIGH #6: Country Field Consistency
  // counterparty lives in l2 schema
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l2', 'counterparty')) {
    const hasCountryOfDom = await columnExists(client, 'l2', 'counterparty', 'country_of_domicile');
    const hasCountryCode = await columnExists(client, 'l2', 'counterparty', 'country_code');
    if (hasCountryOfDom && hasCountryCode) {
      const nullDomQ = await client.query(`
        SELECT COUNT(*) AS cnt
        FROM l2.counterparty
        WHERE country_code IS NOT NULL AND country_of_domicile IS NULL
      `);
      const nullCount = Number(nullDomQ.rows[0].cnt);
      if (nullCount > 0) {
        results.push(check('H6', 'Country Field Consistency', 'HIGH', false,
          `${nullCount} counterparties have country_code populated but country_of_domicile is NULL.`));
      } else {
        results.push(check('H6', 'Country Field Consistency', 'HIGH', true,
          '0 counterparties with NULL country_of_domicile when country_code is populated.'));
      }
    } else {
      // If one of the columns doesn't exist, check what we can
      results.push(check('H6', 'Country Field Consistency', 'HIGH', true,
        'Column country_of_domicile or country_code not found — skipped (not applicable to current schema).'));
    }
  } else {
    results.push(check('H6', 'Country Field Consistency', 'HIGH', false,
      'Table l2.counterparty does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // HIGH #7: DPD Bucket Coverage
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'dpd_bucket_dim')) {
    const bucketQ = await client.query(`
      SELECT COUNT(*) AS cnt FROM l1.dpd_bucket_dim
    `);
    const bucketCount = Number(bucketQ.rows[0].cnt);

    // Check for required buckets (Current=0 and a 1-29 bucket)
    const hasMinDpd = await columnExists(client, 'l1', 'dpd_bucket_dim', 'min_dpd');
    let hasCurrentBucket = false;
    let has1To29Bucket = false;

    if (hasMinDpd) {
      const currentQ = await client.query(`
        SELECT COUNT(*) AS cnt FROM l1.dpd_bucket_dim
        WHERE min_dpd = 0
      `);
      hasCurrentBucket = Number(currentQ.rows[0].cnt) > 0;

      const earlyQ = await client.query(`
        SELECT COUNT(*) AS cnt FROM l1.dpd_bucket_dim
        WHERE min_dpd >= 1 AND min_dpd <= 29
      `);
      has1To29Bucket = Number(earlyQ.rows[0].cnt) > 0;
    } else {
      // Try checking by bucket_name or bucket_code
      const hasName = await columnExists(client, 'l1', 'dpd_bucket_dim', 'bucket_name');
      if (hasName) {
        const nameQ = await client.query(`
          SELECT bucket_name FROM l1.dpd_bucket_dim
        `);
        const names = nameQ.rows.map((r: { bucket_name: string }) => (r.bucket_name || '').toLowerCase());
        hasCurrentBucket = names.some((n: string) => n.includes('current') || n.includes('0'));
        has1To29Bucket = names.some((n: string) => n.includes('1-29') || n.includes('1 - 29'));
      }
    }

    const issues: string[] = [];
    if (bucketCount < 5) issues.push(`only ${bucketCount} buckets (need >= 5)`);
    if (!hasCurrentBucket) issues.push('missing Current (0 DPD) bucket');
    if (!has1To29Bucket) issues.push('missing 1-29 DPD bucket');

    if (issues.length > 0) {
      results.push(check('H7', 'DPD Bucket Coverage', 'HIGH', false,
        `DPD bucket issues: ${issues.join('; ')}.`));
    } else {
      results.push(check('H7', 'DPD Bucket Coverage', 'HIGH', true,
        `${bucketCount} DPD buckets present, including Current (0) and 1-29.`));
    }
  } else {
    results.push(check('H7', 'DPD Bucket Coverage', 'HIGH', false,
      'Table l1.dpd_bucket_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // HIGH #8: Rating Tier Boundaries
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'risk_rating_tier_dim')) {
    const hasTierName = await columnExists(client, 'l1', 'risk_rating_tier_dim', 'tier_name');
    const hasMaxPd = await columnExists(client, 'l1', 'risk_rating_tier_dim', 'max_pd_pct');
    const hasMinPd = await columnExists(client, 'l1', 'risk_rating_tier_dim', 'min_pd_pct');

    if (hasTierName && (hasMaxPd || hasMinPd)) {
      const issues: string[] = [];

      if (hasMaxPd) {
        // IG tier max PD should be >= 0.3%
        const igQ = await client.query(`
          SELECT tier_name, max_pd_pct
          FROM l1.risk_rating_tier_dim
          WHERE LOWER(tier_name) LIKE '%investment%' OR LOWER(tier_name) LIKE '%ig%'
          LIMIT 1
        `);
        if (igQ.rowCount && igQ.rowCount > 0) {
          const igMaxPd = Number(igQ.rows[0].max_pd_pct);
          if (igMaxPd < 0.3) {
            issues.push(`IG tier max PD = ${igMaxPd}% (expected >= 0.3%)`);
          }
        }
      }

      if (hasMinPd) {
        // Loss tier min PD should be >= 20%
        const lossQ = await client.query(`
          SELECT tier_name, min_pd_pct
          FROM l1.risk_rating_tier_dim
          WHERE LOWER(tier_name) LIKE '%loss%' OR LOWER(tier_name) LIKE '%default%'
          LIMIT 1
        `);
        if (lossQ.rowCount && lossQ.rowCount > 0) {
          const lossMinPd = Number(lossQ.rows[0].min_pd_pct);
          if (lossMinPd < 20) {
            issues.push(`Loss tier min PD = ${lossMinPd}% (expected >= 20%)`);
          }
        }
      }

      if (issues.length > 0) {
        results.push(check('H8', 'Rating Tier Boundaries', 'HIGH', false,
          `Rating tier boundary issues: ${issues.join('; ')}.`));
      } else {
        results.push(check('H8', 'Rating Tier Boundaries', 'HIGH', true,
          'Rating tier PD boundaries within expected ranges.'));
      }
    } else {
      results.push(check('H8', 'Rating Tier Boundaries', 'HIGH', true,
        'Columns tier_name/max_pd_pct/min_pd_pct not all present — skipped (not applicable to current schema).'));
    }
  } else {
    results.push(check('H8', 'Rating Tier Boundaries', 'HIGH', false,
      'Table l1.risk_rating_tier_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // HIGH #9: Terminal Status Flags
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'amendment_status_dim')) {
    const hasTerminal = await columnExists(client, 'l1', 'amendment_status_dim', 'is_terminal_flag');
    const hasActive = await columnExists(client, 'l1', 'amendment_status_dim', 'is_active_flag');
    if (hasTerminal && hasActive) {
      const badQ = await client.query(`
        SELECT COUNT(*) AS cnt
        FROM l1.amendment_status_dim
        WHERE is_terminal_flag = TRUE AND is_active_flag = TRUE
      `);
      const badCount = Number(badQ.rows[0].cnt);
      if (badCount > 0) {
        const exQ = await client.query(`
          SELECT amendment_status_code, amendment_status_name
          FROM l1.amendment_status_dim
          WHERE is_terminal_flag = TRUE AND is_active_flag = TRUE
          LIMIT 5
        `);
        const names = exQ.rows.map((r: { amendment_status_code: string; amendment_status_name: string }) =>
          `${r.amendment_status_code} (${r.amendment_status_name})`).join(', ');
        results.push(check('H9', 'Terminal Status Flags', 'HIGH', false,
          `${badCount} amendment statuses are terminal but still active: ${names}`));
      } else {
        results.push(check('H9', 'Terminal Status Flags', 'HIGH', true,
          'All terminal amendment statuses have is_active_flag = FALSE.'));
      }
    } else {
      results.push(check('H9', 'Terminal Status Flags', 'HIGH', true,
        'Columns is_terminal_flag/is_active_flag not both present — skipped.'));
    }
  } else {
    results.push(check('H9', 'Terminal Status Flags', 'HIGH', false,
      'Table l1.amendment_status_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // HIGH #10: Basel Entity Types (PSE and MDB)
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'entity_type_dim')) {
    const hasCode = await columnExists(client, 'l1', 'entity_type_dim', 'entity_type_code');
    if (hasCode) {
      const existQ = await client.query(`
        SELECT entity_type_code
        FROM l1.entity_type_dim
        WHERE entity_type_code IN ('PSE', 'MDB')
      `);
      const foundCodes = existQ.rows.map((r: { entity_type_code: string }) => r.entity_type_code);
      const missing = ['PSE', 'MDB'].filter(c => !foundCodes.includes(c));
      if (missing.length > 0) {
        results.push(check('H10', 'Basel Entity Types', 'HIGH', false,
          `entity_type_dim missing required Basel entity types: ${missing.join(', ')}`));
      } else {
        results.push(check('H10', 'Basel Entity Types', 'HIGH', true,
          'entity_type_dim includes PSE and MDB entity types.'));
      }
    } else {
      results.push(check('H10', 'Basel Entity Types', 'HIGH', false,
        'Column entity_type_code not found in entity_type_dim.'));
    }
  } else {
    results.push(check('H10', 'Basel Entity Types', 'HIGH', false,
      'Table l1.entity_type_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // HIGH #11: Instrument Identifier Currency Flag
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'instrument_identifier')) {
    const hasCurrent = await columnExists(client, 'l1', 'instrument_identifier', 'is_current_flag');
    if (hasCurrent) {
      const currentQ = await client.query(`
        SELECT COUNT(*) AS cnt
        FROM l1.instrument_identifier
        WHERE is_current_flag = TRUE
      `);
      const currentCount = Number(currentQ.rows[0].cnt);
      if (currentCount === 0) {
        const totalQ = await client.query(`SELECT COUNT(*) AS cnt FROM l1.instrument_identifier`);
        const totalCount = Number(totalQ.rows[0].cnt);
        if (totalCount > 0) {
          results.push(check('H11', 'Instrument Identifier Currency', 'HIGH', false,
            `${totalCount} instrument identifiers exist but none have is_current_flag = TRUE.`));
        } else {
          results.push(check('H11', 'Instrument Identifier Currency', 'HIGH', true,
            'Table instrument_identifier is empty — no current-flag check needed.'));
        }
      } else {
        results.push(check('H11', 'Instrument Identifier Currency', 'HIGH', true,
          `${currentCount} instrument identifiers have is_current_flag = TRUE.`));
      }
    } else {
      results.push(check('H11', 'Instrument Identifier Currency', 'HIGH', true,
        'Column is_current_flag not found in instrument_identifier — skipped.'));
    }
  } else {
    results.push(check('H11', 'Instrument Identifier Currency', 'HIGH', false,
      'Table l1.instrument_identifier does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // HIGH #12: Date/Time Integrity
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'date_time_dim')) {
    const hasHour = await columnExists(client, 'l1', 'date_time_dim', 'hour_of_day');
    const hasTs = await columnExists(client, 'l1', 'date_time_dim', 'timestamp_utc');
    if (hasHour && hasTs) {
      const mismatchQ = await client.query(`
        SELECT COUNT(*) AS cnt
        FROM l1.date_time_dim
        WHERE hour_of_day <> EXTRACT(HOUR FROM timestamp_utc)::INTEGER
      `);
      const mismatchCount = Number(mismatchQ.rows[0].cnt);
      if (mismatchCount > 0) {
        results.push(check('H12', 'Date/Time Integrity', 'HIGH', false,
          `${mismatchCount} rows in date_time_dim have hour_of_day mismatched with EXTRACT(HOUR FROM timestamp_utc).`));
      } else {
        const totalQ = await client.query(`SELECT COUNT(*) AS cnt FROM l1.date_time_dim`);
        const totalCount = Number(totalQ.rows[0].cnt);
        results.push(check('H12', 'Date/Time Integrity', 'HIGH', true,
          `All ${totalCount} date_time_dim rows: hour_of_day matches EXTRACT(HOUR FROM timestamp_utc).`));
      }
    } else {
      results.push(check('H12', 'Date/Time Integrity', 'HIGH', true,
        'Columns hour_of_day/timestamp_utc not both present — skipped.'));
    }
  } else {
    results.push(check('H12', 'Date/Time Integrity', 'HIGH', false,
      'Table l1.date_time_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // MEDIUM #13: Country Dim Coverage
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'country_dim')) {
    const countQ = await client.query(`SELECT COUNT(*) AS cnt FROM l1.country_dim`);
    const countryCount = Number(countQ.rows[0].cnt);
    const threshold = 40;
    if (countryCount < threshold) {
      results.push(check('M13', 'Country Dim Coverage', 'MEDIUM', false,
        `Only ${countryCount} countries in country_dim (need >= ${threshold}).`));
    } else {
      results.push(check('M13', 'Country Dim Coverage', 'MEDIUM', true,
        `${countryCount} countries in country_dim (>= ${threshold} required).`));
    }
  } else {
    results.push(check('M13', 'Country Dim Coverage', 'MEDIUM', false,
      'Table l1.country_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // MEDIUM #14: Currency Coverage (G10)
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'currency_dim')) {
    const G10 = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK'];
    const hasCode = await columnExists(client, 'l1', 'currency_dim', 'currency_code');
    if (hasCode) {
      const existQ = await client.query(`
        SELECT currency_code FROM l1.currency_dim
        WHERE currency_code = ANY($1::text[])
      `, [G10]);
      const found = existQ.rows.map((r: { currency_code: string }) => r.currency_code);
      const missing = G10.filter(c => !found.includes(c));
      if (missing.length > 0) {
        results.push(check('M14', 'Currency Coverage', 'MEDIUM', false,
          `currency_dim missing G10 currencies: ${missing.join(', ')}`));
      } else {
        results.push(check('M14', 'Currency Coverage', 'MEDIUM', true,
          `All ${G10.length} G10 currencies present in currency_dim.`));
      }
    } else {
      results.push(check('M14', 'Currency Coverage', 'MEDIUM', false,
        'Column currency_code not found in currency_dim.'));
    }
  } else {
    results.push(check('M14', 'Currency Coverage', 'MEDIUM', false,
      'Table l1.currency_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // MEDIUM #15: Interest Rate Index Coverage
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'interest_rate_index_dim')) {
    const required = ['SOFR', 'EURIBOR', 'SONIA', 'TONA', 'CORRA', 'SORA', 'ESTR'];
    // Try index_code first, then index_name
    const hasCode = await columnExists(client, 'l1', 'interest_rate_index_dim', 'index_code');
    const hasName = await columnExists(client, 'l1', 'interest_rate_index_dim', 'index_name');

    if (hasCode || hasName) {
      const col = hasCode ? 'index_code' : 'index_name';
      const existQ = await client.query(`
        SELECT DISTINCT UPPER(${col}) AS idx
        FROM l1.interest_rate_index_dim
      `);
      const found = existQ.rows.map((r: { idx: string }) => r.idx);

      const missing = required.filter(req =>
        !found.some((f: string) => f.includes(req))
      );

      if (missing.length > 0) {
        results.push(check('M15', 'Interest Rate Index Coverage', 'MEDIUM', false,
          `interest_rate_index_dim missing benchmark indices: ${missing.join(', ')}`));
      } else {
        results.push(check('M15', 'Interest Rate Index Coverage', 'MEDIUM', true,
          `All ${required.length} required benchmark indices present (${required.join(', ')}).`));
      }
    } else {
      results.push(check('M15', 'Interest Rate Index Coverage', 'MEDIUM', false,
        'Neither index_code nor index_name found in interest_rate_index_dim.'));
    }
  } else {
    results.push(check('M15', 'Interest Rate Index Coverage', 'MEDIUM', false,
      'Table l1.interest_rate_index_dim does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // MEDIUM #16: Collateral Type Completeness
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'collateral_type')) {
    const countQ = await client.query(`SELECT COUNT(DISTINCT collateral_type_id) AS cnt FROM l1.collateral_type`);
    const typeCount = Number(countQ.rows[0].cnt);
    const threshold = 8;
    if (typeCount < threshold) {
      results.push(check('M16', 'Collateral Type Completeness', 'MEDIUM', false,
        `Only ${typeCount} distinct collateral types (need >= ${threshold}).`));
    } else {
      results.push(check('M16', 'Collateral Type Completeness', 'MEDIUM', true,
        `${typeCount} distinct collateral types (>= ${threshold} required).`));
    }
  } else {
    results.push(check('M16', 'Collateral Type Completeness', 'MEDIUM', false,
      'Table l1.collateral_type does not exist.'));
  }

  // ─────────────────────────────────────────────────────────────────────
  // MEDIUM #17: FX Rate Coverage
  // ─────────────────────────────────────────────────────────────────────
  if (
    await tableExists(client, 'l2', 'fx_rate') &&
    await tableExists(client, 'l1', 'currency_dim')
  ) {
    const hasCurrCode = await columnExists(client, 'l1', 'currency_dim', 'currency_code');
    const hasFromCurr = await columnExists(client, 'l2', 'fx_rate', 'from_currency_code');
    if (hasCurrCode && hasFromCurr) {
      const coverageQ = await client.query(`
        SELECT cd.currency_code
        FROM l1.currency_dim cd
        WHERE cd.currency_code <> 'USD'
          AND NOT EXISTS (
            SELECT 1 FROM l2.fx_rate fx
            WHERE fx.from_currency_code = cd.currency_code
              AND fx.to_currency_code = 'USD'
          )
      `);
      const missingCount = coverageQ.rowCount ?? 0;
      if (missingCount > 0) {
        const missingCodes = coverageQ.rows
          .slice(0, 10)
          .map((r: { currency_code: string }) => r.currency_code)
          .join(', ');
        results.push(check('M17', 'FX Rate Coverage', 'MEDIUM', false,
          `${missingCount} currencies in currency_dim have no USD FX rate: ${missingCodes}${missingCount > 10 ? '...' : ''}`));
      } else {
        results.push(check('M17', 'FX Rate Coverage', 'MEDIUM', true,
          'All non-USD currencies in currency_dim have at least one FX rate to USD.'));
      }
    } else {
      results.push(check('M17', 'FX Rate Coverage', 'MEDIUM', true,
        'Required columns not found for FX rate coverage check — skipped.'));
    }
  } else {
    const missingTables: string[] = [];
    if (!(await tableExists(client, 'l2', 'fx_rate'))) missingTables.push('l2.fx_rate');
    if (!(await tableExists(client, 'l1', 'currency_dim'))) missingTables.push('l1.currency_dim');
    results.push(check('M17', 'FX Rate Coverage', 'MEDIUM', false,
      `Required tables missing: ${missingTables.join(', ')}`));
  }

  // ─────────────────────────────────────────────────────────────────────
  // MEDIUM #18: Ledger Normal Balance
  // ─────────────────────────────────────────────────────────────────────
  if (await tableExists(client, 'l1', 'ledger_account_dim')) {
    const hasNormal = await columnExists(client, 'l1', 'ledger_account_dim', 'normal_balance_code');
    const hasName = await columnExists(client, 'l1', 'ledger_account_dim', 'account_name');
    if (hasNormal && hasName) {
      const allowanceQ = await client.query(`
        SELECT account_name, normal_balance_code
        FROM l1.ledger_account_dim
        WHERE LOWER(account_name) LIKE '%allowance%'
          AND normal_balance_code <> 'CR'
      `);
      if (allowanceQ.rowCount && allowanceQ.rowCount > 0) {
        const wrong = allowanceQ.rows.map((r: { account_name: string; normal_balance_code: string }) =>
          `${r.account_name}=${r.normal_balance_code}`).join(', ');
        results.push(check('M18', 'Ledger Normal Balance', 'MEDIUM', false,
          `Allowance accounts with non-CR normal balance: ${wrong}`));
      } else {
        results.push(check('M18', 'Ledger Normal Balance', 'MEDIUM', true,
          'All allowance accounts have CR normal balance (or no allowance accounts found).'));
      }
    } else {
      results.push(check('M18', 'Ledger Normal Balance', 'MEDIUM', true,
        'Columns normal_balance_code/account_name not both present — skipped.'));
    }
  } else {
    results.push(check('M18', 'Ledger Normal Balance', 'MEDIUM', false,
      'Table l1.ledger_account_dim does not exist.'));
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(`${C.red}ERROR: DATABASE_URL not set. Add it to .env or export it.${C.reset}`);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  let results: CheckResult[];
  try {
    results = await runChecks(client);
  } finally {
    await client.end();
  }

  // ── Print report ──────────────────────────────────────────────────
  console.log('');
  console.log(`${C.bold}L1 Reference Data Quality Validation${C.reset}`);
  console.log('======================================');

  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM'];

  for (const sev of severities) {
    const checks = results.filter(r => r.severity === sev);
    if (checks.length === 0) continue;

    const label = sev === 'CRITICAL' ? 'CRITICAL' : sev === 'HIGH' ? 'HIGH' : 'MEDIUM';
    console.log(`${C.bold}${severityColor(sev)}[${label}]${C.reset}`);

    for (const c of checks) {
      const icon = c.passed ? `${C.green}\u2713${C.reset}` : `${C.red}\u2717${C.reset}`;
      console.log(`  ${icon} ${C.bold}${c.name}${C.reset} ${C.dim}\u2014${C.reset} ${c.detail}`);
    }
    console.log('');
  }

  // ── Summary ────────────────────────────────────────────────────────
  const critFails = results.filter(r => r.severity === 'CRITICAL' && !r.passed).length;
  const highFails = results.filter(r => r.severity === 'HIGH' && !r.passed).length;
  const medFails = results.filter(r => r.severity === 'MEDIUM' && !r.passed).length;

  const critTotal = results.filter(r => r.severity === 'CRITICAL').length;
  const highTotal = results.filter(r => r.severity === 'HIGH').length;
  const medTotal = results.filter(r => r.severity === 'MEDIUM').length;

  console.log('======================================');
  console.log(
    `Result: ` +
    `${critFails > 0 ? C.red : C.green}${critFails} CRITICAL ${severityLabel('CRITICAL')}${critFails !== 1 ? 's' : ''}${C.reset}` +
    ` (of ${critTotal}), ` +
    `${highFails > 0 ? C.yellow : C.green}${highFails} HIGH ${severityLabel('HIGH')}${highFails !== 1 ? 's' : ''}${C.reset}` +
    ` (of ${highTotal}), ` +
    `${medFails > 0 ? C.cyan : C.green}${medFails} MEDIUM ${severityLabel('MEDIUM')}${C.reset}` +
    ` (of ${medTotal})`
  );

  // Exit 1 only if CRITICAL checks failed
  if (critFails > 0) {
    console.log(`\n${C.red}${C.bold}FAILED${C.reset}: ${critFails} critical check${critFails !== 1 ? 's' : ''} failed.`);
    process.exit(1);
  } else {
    console.log(`\n${C.green}${C.bold}PASSED${C.reset}: All critical checks passed.`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(`${C.red}Unexpected error:${C.reset}`, err);
  process.exit(1);
});
