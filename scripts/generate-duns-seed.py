#!/usr/bin/env python3
"""Generate DUNS seed data (004a-duns-seed-data.sql) from existing counterparty INSERTs.

Parses counterparty INSERT statements from the 3 seed files, generates:
- l1.duns_entity_dim rows with realistic D&B firmographic data
- UPDATE statements to set duns_number, duns_hq_number, duns_global_ultimate on l2.counterparty

Usage: python3 scripts/generate-duns-seed.py > sql/migrations/004a-duns-seed-data.sql
"""

import re
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED_FILES = [
    ROOT / "sql/gsib-export/04-l2-seed.sql",
    ROOT / "sql/gsib-export/05-scenario-seed.sql",
    ROOT / "sql/gsib-export/06-factory-scenarios.sql",
]

# Hierarchy groups: child_id -> ultimate_parent_id
HIERARCHY_GROUPS = {
    # ConFin group (S4)
    1152: 1151, 1153: 1151, 1154: 1151, 1155: 1151,
    # Factory groups
    3329: 3328, 3330: 3328,
    3345: 3344, 3346: 3344,
    3355: 3354, 3356: 3354, 3357: 3354,
    3395: 3394, 3396: 3394,
}

# Country code -> DUNS prefix (first 2 digits)
COUNTRY_DUNS_PREFIX = {
    'US': '06', 'GB': '21', 'DE': '31', 'FR': '33', 'CH': '41',
    'JP': '43', 'AU': '50', 'CA': '20', 'SG': '53', 'NL': '34',
    'BR': '55', 'IN': '65', 'HK': '48', 'KR': '47', 'MX': '54',
    'AE': '60', 'IE': '36', 'IT': '37',
}

# SIC codes by industry_id (NAICS sector)
INDUSTRY_SIC = {
    21: '1311',  # Oil & Gas Extraction
    31: '3559',  # Special Industry Machinery
    32: '3291',  # Abrasive Products (Materials)
    33: '3443',  # Fabricated Plate Work
    44: '5411',  # Grocery Stores
    45: '5947',  # Gift/Novelty Retail
    48: '4512',  # Air Transportation
    49: '4911',  # Electric Services
    51: '7372',  # Prepackaged Software
    52: '6021',  # National Commercial Banks
    53: '6512',  # Operators of Real Estate
    54: '8711',  # Engineering Services
    56: '7361',  # Help Supply Services
    61: '8211',  # Elementary/Secondary Schools
    62: '2834',  # Pharmaceutical Preparations
    71: '6512',  # Real Estate (same as 53)
    72: '5812',  # Eating Places
    81: '7538',  # General Auto Repair
}

# NAICS codes by industry_id
INDUSTRY_NAICS = {
    21: '211120', 31: '333249', 32: '327910', 33: '332313',
    44: '445110', 45: '453220', 48: '481111', 49: '221111',
    51: '511210', 52: '522110', 53: '531120', 54: '541330',
    56: '561311', 61: '611110', 62: '325412', 71: '531120',
    72: '722511', 81: '811111',
}


def generate_duns(country_code: str, counterparty_id: int) -> str:
    """Generate a deterministic 9-digit DUNS number."""
    prefix = COUNTRY_DUNS_PREFIX.get(country_code, '80')
    # Use hash for deterministic but varied middle digits
    h = hashlib.md5(f"duns-{counterparty_id}".encode()).hexdigest()
    mid = int(h[:8], 16) % 10000000  # 7 digits
    return f"{prefix}{mid:07d}"


def rating_to_dnb(sp_rating: str, obligor_type: str) -> dict:
    """Map S&P rating + obligor type to D&B rating, PAYDEX, failure score."""
    sp = (sp_rating or '').strip("'").upper()

    # Net worth indicator based on obligor type
    if obligor_type in ('LARGE_CORPORATE', 'BANK'):
        nw = '5A'
    elif obligor_type in ('MIDDLE_MARKET',):
        nw = '3A'
    elif obligor_type in ('CRE',):
        nw = '4A'
    else:
        nw = '2A'

    # Credit appraisal based on rating
    if sp in ('AA+', 'AA', 'AA-'):
        return {'dnb_rating': f'{nw}1', 'paydex': 94, 'failure': 3}
    elif sp in ('A+', 'A'):
        return {'dnb_rating': f'{nw}1', 'paydex': 89, 'failure': 6}
    elif sp in ('A-',):
        return {'dnb_rating': f'{nw}1', 'paydex': 85, 'failure': 9}
    elif sp in ('BBB+',):
        return {'dnb_rating': f'{nw}2', 'paydex': 78, 'failure': 15}
    elif sp in ('BBB',):
        return {'dnb_rating': f'{nw}2', 'paydex': 74, 'failure': 20}
    elif sp in ('BBB-',):
        return {'dnb_rating': f'{nw}3', 'paydex': 65, 'failure': 32}
    elif sp in ('BB+',):
        return {'dnb_rating': f'{nw}3', 'paydex': 58, 'failure': 40}
    elif sp in ('BB',):
        return {'dnb_rating': f'{nw}3', 'paydex': 52, 'failure': 48}
    elif sp in ('BB-',):
        return {'dnb_rating': f'{nw}4', 'paydex': 45, 'failure': 55}
    elif sp in ('B+',):
        return {'dnb_rating': f'{nw}4', 'paydex': 38, 'failure': 65}
    elif sp in ('B',):
        return {'dnb_rating': f'{nw}4', 'paydex': 30, 'failure': 75}
    elif sp in ('B-', 'CCC+', 'CCC', 'CCC-'):
        return {'dnb_rating': f'{nw}4', 'paydex': 22, 'failure': 85}
    else:
        return {'dnb_rating': f'{nw}2', 'paydex': 70, 'failure': 25}


def estimate_employees(obligor_type: str, industry_id: int) -> int:
    """Estimate employee count based on obligor type and industry."""
    base = {
        'LARGE_CORPORATE': 12000, 'BANK': 25000, 'MIDDLE_MARKET': 1500,
        'CRE': 200, 'FUND': 80, 'INS': 8000,
    }.get(obligor_type, 500)
    # Vary by a hash-like factor
    return max(50, int(base * (0.5 + (industry_id % 7) * 0.15)))


def estimate_revenue(obligor_type: str, industry_id: int, cp_id: int) -> float:
    """Estimate annual revenue in millions USD."""
    base = {
        'LARGE_CORPORATE': 5000, 'BANK': 15000, 'MIDDLE_MARKET': 800,
        'CRE': 250, 'FUND': 500, 'INS': 3000,
    }.get(obligor_type, 300)
    factor = 0.6 + (cp_id % 13) * 0.08
    return round(base * factor, 2)


def parse_counterparty_inserts(filepath: Path) -> list:
    """Parse INSERT INTO counterparty statements and extract fields."""
    results = []
    text = filepath.read_text()

    # Match INSERT INTO (l1|l2).counterparty ... VALUES (...)
    pattern = re.compile(
        r"INSERT INTO (?:l[12]\.)counterparty\s*\([^)]+\)\s*VALUES\s*\((.+?)\);",
        re.DOTALL
    )
    for m in pattern.finditer(text):
        vals_str = m.group(1)
        # Split by comma but respect quoted strings
        vals = []
        current = []
        in_quote = False
        for ch in vals_str:
            if ch == "'" and not in_quote:
                in_quote = True
                current.append(ch)
            elif ch == "'" and in_quote:
                in_quote = False
                current.append(ch)
            elif ch == ',' and not in_quote:
                vals.append(''.join(current).strip())
                current = []
            else:
                current.append(ch)
        vals.append(''.join(current).strip())

        if len(vals) < 20:
            continue

        cp_id = int(vals[0])
        legal_name = vals[1].strip("'")
        cp_type = vals[2].strip("'")
        country = vals[3].strip("'")
        industry = int(vals[5]) if vals[5].strip() not in ('NULL', '') else 51
        sp_rating = vals[14].strip("'") if len(vals) > 14 else 'BBB'
        y14_type = vals[31].strip("'") if len(vals) > 31 else 'LARGE_CORPORATE'

        results.append({
            'id': cp_id,
            'name': legal_name,
            'type': cp_type,
            'country': country,
            'industry': industry,
            'sp_rating': sp_rating,
            'y14_type': y14_type,
        })

    return results


def sql_str(s):
    """Escape a string for SQL."""
    return s.replace("'", "''")


def main():
    # Parse all counterparty data
    all_cps = []
    for f in SEED_FILES:
        if f.exists():
            all_cps.extend(parse_counterparty_inserts(f))

    # Deduplicate by ID
    seen = set()
    cps = []
    for cp in all_cps:
        if cp['id'] not in seen:
            seen.add(cp['id'])
            cps.append(cp)

    # Generate DUNS for non-INDIVIDUAL counterparties
    duns_map = {}  # cp_id -> duns_number
    for cp in cps:
        if cp['type'] == 'INDIVIDUAL':
            continue
        duns_map[cp['id']] = generate_duns(cp['country'], cp['id'])

    # Build dim entries and update statements
    dim_rows = []
    update_rows = []

    for cp in cps:
        if cp['type'] == 'INDIVIDUAL':
            continue

        duns = duns_map[cp['id']]
        dnb = rating_to_dnb(cp['sp_rating'], cp['y14_type'])
        employees = estimate_employees(cp['y14_type'], cp['industry'])
        revenue = estimate_revenue(cp['y14_type'], cp['industry'], cp['id'])
        sic = INDUSTRY_SIC.get(cp['industry'], '9999')
        naics = INDUSTRY_NAICS.get(cp['industry'], '999999')

        # Add some variation to PAYDEX/failure scores based on cp_id
        paydex_var = (cp['id'] * 7) % 9 - 4  # -4 to +4
        paydex = max(10, min(100, dnb['paydex'] + paydex_var))
        fail_var = (cp['id'] * 11) % 7 - 3  # -3 to +3
        failure = max(1, min(99, dnb['failure'] + fail_var))

        # Determine trade style name (DBA) - only for some
        trade_style = 'NULL'
        if cp['id'] % 5 == 0:
            short = cp['name'].split()[0]
            trade_style = f"'{sql_str(short)} Group'"

        dim_rows.append({
            'duns': duns,
            'name': cp['name'],
            'trade_style': trade_style,
            'sic': sic,
            'naics': naics,
            'employees': employees,
            'revenue': revenue,
            'country': cp['country'],
            'paydex': paydex,
            'dnb_rating': dnb['dnb_rating'],
            'failure': failure,
        })

        # Determine hierarchy DUNS
        if cp['id'] in HIERARCHY_GROUPS:
            parent_id = HIERARCHY_GROUPS[cp['id']]
            duns_hq = duns_map.get(parent_id, duns)
            duns_gu = duns_map.get(parent_id, duns)
        else:
            duns_hq = duns
            duns_gu = duns

        update_rows.append({
            'cp_id': cp['id'],
            'duns': duns,
            'duns_hq': duns_hq,
            'duns_gu': duns_gu,
        })

    # Output SQL
    print("-- DUNS Seed Data (auto-generated by scripts/generate-duns-seed.py)")
    print("-- Populates l1.duns_entity_dim and updates l2.counterparty with DUNS identifiers")
    print("--")
    print(f"-- Total dim entries: {len(dim_rows)}")
    print(f"-- Total counterparty updates: {len(update_rows)}")
    print(f"-- Skipped INDIVIDUAL counterparties: {sum(1 for cp in cps if cp['type'] == 'INDIVIDUAL')}")
    print()
    print("SET client_min_messages TO WARNING;")
    print("SET search_path TO l1, l2, l3, public;")
    print()

    # Part 1: DIM inserts
    print("-- " + "=" * 70)
    print("-- Part 1: l1.duns_entity_dim — D&B firmographic enrichment data")
    print("-- " + "=" * 70)
    print()

    for row in dim_rows:
        ts = (
            f"'{row['duns']}', "
            f"'{sql_str(row['name'])}', "
            f"{row['trade_style']}, "
            f"'{row['sic']}', "
            f"'{row['naics']}', "
            f"{row['employees']}, "
            f"{row['revenue']:.4f}, "
            f"'{row['country']}', "
            f"{row['paydex']}, "
            f"'{row['dnb_rating']}', "
            f"{row['failure']}, "
            f"FALSE, "
            f"'2025-01-15', "
            f"CURRENT_TIMESTAMP, "
            f"CURRENT_TIMESTAMP"
        )
        print(f"INSERT INTO l1.duns_entity_dim (duns_number, business_name, trade_style_name, sic_code, naics_code, employee_count, annual_revenue_amt, duns_country_code, paydex_score, dnb_rating, failure_score, is_out_of_business_flag, last_updated_date, created_ts, updated_ts) VALUES ({ts}) ON CONFLICT (duns_number) DO NOTHING;")

    print()
    print("-- " + "=" * 70)
    print("-- Part 2: UPDATE l2.counterparty with DUNS identifiers")
    print("-- " + "=" * 70)
    print()

    for row in update_rows:
        print(f"UPDATE l2.counterparty SET duns_number = '{row['duns']}', duns_hq_number = '{row['duns_hq']}', duns_global_ultimate = '{row['duns_gu']}' WHERE counterparty_id = {row['cp_id']};")

    print()
    print("-- Done. Verify with:")
    print("-- SELECT count(*) FROM l1.duns_entity_dim;")
    print("-- SELECT count(*) FROM l2.counterparty WHERE duns_number IS NOT NULL;")
    print("-- SELECT count(*) FROM l2.counterparty WHERE counterparty_type = 'INDIVIDUAL' AND duns_number IS NOT NULL;  -- should be 0")


if __name__ == '__main__':
    main()
