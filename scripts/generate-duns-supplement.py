#!/usr/bin/env python3
"""Generate supplementary DUNS seed data for DB counterparties not in SQL seed files.

Reads /tmp/missing_cps.csv (pipe-delimited) and generates SQL to:
1. INSERT into l1.duns_entity_dim
2. UPDATE l2.counterparty with DUNS numbers

Usage: python3 scripts/generate-duns-supplement.py >> sql/migrations/004a-duns-seed-data.sql
"""

import hashlib
from pathlib import Path

COUNTRY_DUNS_PREFIX = {
    'US': '06', 'GB': '21', 'DE': '31', 'FR': '33', 'CH': '41',
    'JP': '43', 'AU': '50', 'CA': '20', 'SG': '53', 'NL': '34',
    'BR': '55', 'IN': '65', 'HK': '48', 'KR': '47', 'MX': '54',
    'AE': '60', 'IE': '36', 'IT': '37', 'SE': '35', 'NO': '38',
    'TW': '46', 'CN': '44', 'MY': '52', 'TH': '51', 'ID': '66',
    'PH': '67', 'VN': '68', 'ZA': '69', 'CL': '56', 'CO': '57',
    'PE': '58', 'AR': '59',
}

INDUSTRY_SIC = {
    21: '1311', 31: '3559', 32: '3291', 33: '3443',
    44: '5411', 45: '5947', 48: '4512', 49: '4911',
    51: '7372', 52: '6021', 53: '6512', 54: '8711',
    56: '7361', 61: '8211', 62: '2834', 71: '6512',
    72: '5812', 81: '7538',
}

INDUSTRY_NAICS = {
    21: '211120', 31: '333249', 32: '327910', 33: '332313',
    44: '445110', 45: '453220', 48: '481111', 49: '221111',
    51: '511210', 52: '522110', 53: '531120', 54: '541330',
    56: '561311', 61: '611110', 62: '325412', 71: '531120',
    72: '722511', 81: '811111',
}


def generate_duns(country_code, counterparty_id):
    prefix = COUNTRY_DUNS_PREFIX.get(country_code, '80')
    h = hashlib.md5(f"duns-{counterparty_id}".encode()).hexdigest()
    mid = int(h[:8], 16) % 10000000
    return f"{prefix}{mid:07d}"


def rating_to_dnb(sp_rating, obligor_type):
    sp = (sp_rating or '').strip().upper()
    nw = {'LARGE_CORPORATE': '5A', 'BANK': '5A', 'MIDDLE_MARKET': '3A',
          'CRE': '4A'}.get(obligor_type, '2A')
    mapping = {
        'AA+': (1, 94, 3), 'AA': (1, 92, 4), 'AA-': (1, 90, 5),
        'A+': (1, 89, 6), 'A': (1, 87, 8), 'A-': (1, 85, 9),
        'BBB+': (2, 78, 15), 'BBB': (2, 74, 20), 'BBB-': (3, 65, 32),
        'BB+': (3, 58, 40), 'BB': (3, 52, 48), 'BB-': (4, 45, 55),
        'B+': (4, 38, 65), 'B': (4, 30, 75), 'B-': (4, 22, 85),
    }
    appraisal, paydex, failure = mapping.get(sp, (2, 70, 25))
    return f"{nw}{appraisal}", paydex, failure


def estimate_employees(obligor_type, industry_id):
    base = {'LARGE_CORPORATE': 12000, 'BANK': 25000, 'MIDDLE_MARKET': 1500,
            'CRE': 200}.get(obligor_type, 500)
    return max(50, int(base * (0.5 + (industry_id % 7) * 0.15)))


def estimate_revenue(obligor_type, cp_id):
    base = {'LARGE_CORPORATE': 5000, 'BANK': 15000, 'MIDDLE_MARKET': 800,
            'CRE': 250}.get(obligor_type, 300)
    return round(base * (0.6 + (cp_id % 13) * 0.08), 2)


def sql_str(s):
    return s.replace("'", "''")


def main():
    csv_path = Path('/tmp/missing_cps.csv')
    rows = []
    for line in csv_path.read_text().strip().split('\n'):
        if not line.strip():
            continue
        parts = line.split('|')
        if len(parts) < 9:
            continue
        rows.append({
            'id': int(parts[0]),
            'name': parts[1],
            'type': parts[2],
            'country': parts[3],
            'industry': int(parts[4]) if parts[4] else 51,
            'sp_rating': parts[5],
            'y14_type': parts[6],
            'parent_id': int(parts[7]),
            'ultimate_id': int(parts[8]),
        })

    # Generate DUNS for all
    duns_map = {}
    for r in rows:
        duns_map[r['id']] = generate_duns(r['country'], r['id'])

    print()
    print("-- " + "=" * 70)
    print("-- Supplement: DB counterparties not in SQL seed files (IDs 3971+)")
    print(f"-- Total: {len(rows)} counterparties")
    print("-- " + "=" * 70)
    print()

    # Part 1: DIM inserts
    for r in rows:
        duns = duns_map[r['id']]
        dnb_rating, paydex_base, failure_base = rating_to_dnb(r['sp_rating'], r['y14_type'])
        paydex_var = (r['id'] * 7) % 9 - 4
        paydex = max(10, min(100, paydex_base + paydex_var))
        fail_var = (r['id'] * 11) % 7 - 3
        failure = max(1, min(99, failure_base + fail_var))
        employees = estimate_employees(r['y14_type'], r['industry'])
        revenue = estimate_revenue(r['y14_type'], r['id'])
        sic = INDUSTRY_SIC.get(r['industry'], '9999')
        naics = INDUSTRY_NAICS.get(r['industry'], '999999')
        trade_style = 'NULL'
        if r['id'] % 5 == 0:
            trade_style = f"'{sql_str(r['name'].split()[0])} Group'"

        print(f"INSERT INTO l1.duns_entity_dim (duns_number, business_name, trade_style_name, sic_code, naics_code, employee_count, annual_revenue_amt, duns_country_code, paydex_score, dnb_rating, failure_score, is_out_of_business_flag, last_updated_date, created_ts, updated_ts) VALUES ('{duns}', '{sql_str(r['name'])}', {trade_style}, '{sic}', '{naics}', {employees}, {revenue:.4f}, '{r['country']}', {paydex}, '{dnb_rating}', {failure}, FALSE, '2025-01-15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT (duns_number) DO NOTHING;")

    print()

    # Part 2: UPDATEs
    for r in rows:
        duns = duns_map[r['id']]
        if r['parent_id'] != r['id'] and r['ultimate_id'] in duns_map:
            duns_hq = duns_map[r['ultimate_id']]
            duns_gu = duns_map[r['ultimate_id']]
        elif r['parent_id'] != r['id'] and r['parent_id'] in duns_map:
            duns_hq = duns_map[r['parent_id']]
            duns_gu = duns_map[r['parent_id']]
        else:
            duns_hq = duns
            duns_gu = duns

        # Check if parent already has DUNS from first batch
        # If parent is in 1-1720 range, look up from the first batch
        if r['parent_id'] != r['id'] and r['parent_id'] not in duns_map:
            parent_duns = generate_duns('US', r['parent_id'])  # approximate
            duns_hq = parent_duns
            duns_gu = parent_duns

        print(f"UPDATE l2.counterparty SET duns_number = '{duns}', duns_hq_number = '{duns_hq}', duns_global_ultimate = '{duns_gu}' WHERE counterparty_id = {r['id']};")


if __name__ == '__main__':
    main()
