/* ────────────────────────────────────────────────────────────────────────────
 * External Rating Lineage Demo — Sample Rollup Data
 *
 * Provides realistic numbers for the rollup walkthrough animation.
 * External Rating uses notch-based averaging:
 *   ratings → notches → AVG → ROUND → reverse lookup
 *
 * Math is pre-verified — all averages and lookups are consistent.
 * ──────────────────────────────────────────────────────────────────────────── */

/* ── Notch scale lookup (S&P convention) ─────────────────────────────────── */

export const NOTCH_TO_RATING: Record<number, string> = {
  1: 'AAA', 2: 'AA+', 3: 'AA', 4: 'AA-',
  5: 'A+', 6: 'A', 7: 'A-',
  8: 'BBB+', 9: 'BBB', 10: 'BBB-',
  11: 'BB+', 12: 'BB', 13: 'BB-',
  14: 'B+', 15: 'B', 16: 'B-',
  17: 'CCC+', 18: 'CCC', 19: 'CCC-',
  20: 'CC', 21: 'C', 22: 'D',
};

export const RATING_TO_NOTCH: Record<string, number> = Object.fromEntries(
  Object.entries(NOTCH_TO_RATING).map(([k, v]) => [v, Number(k)])
);

/* ── Counterparty-level data ─────────────────────────────────────────────── */

export interface ExtRatingCounterpartyRow {
  counterpartyId: string;
  counterpartyName: string;
  rating: string;
  notch: number;
  agency: string;
  isInvestmentGrade: boolean;
}

export const COUNTERPARTIES: ExtRatingCounterpartyRow[] = [
  {
    counterpartyId: 'CP-01',
    counterpartyName: 'Sunrise Properties',
    rating: 'BBB+',
    notch: 8,
    agency: 'S&P',
    isInvestmentGrade: true,
  },
  {
    counterpartyId: 'CP-02',
    counterpartyName: 'Meridian Holdings',
    rating: 'A-',
    notch: 7,
    agency: 'S&P',
    isInvestmentGrade: true,
  },
];

/* ── Desk-level data ─────────────────────────────────────────────────────── */

export interface ExtRatingDeskRow {
  deskName: string;
  segmentId: string;
  counterparties: string[];  // counterparty IDs
  notches: number[];
  avgNotch: number;
  roundedNotch: number;
  avgRating: string;
  color: string;
  colorBg: string;
}

/*
 * Math verification:
 *   CRE Desk:  counterparties = [CP-01(8), CP-02(7)] → AVG = (8+7)/2 = 7.5 → ROUND = 8 → BBB+
 *   Corp Desk: counterparties = [CP-02(7)]           → AVG = 7/1 = 7.0   → ROUND = 7 → A-
 */
export const DESK_ROWS: ExtRatingDeskRow[] = [
  {
    deskName: 'CRE Lending Desk',
    segmentId: 'SEG-L3-CRE',
    counterparties: ['CP-01', 'CP-02'],
    notches: [8, 7],
    avgNotch: 7.5,
    roundedNotch: 8,
    avgRating: 'BBB+',
    color: 'text-blue-400',
    colorBg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    deskName: 'Corp Lending Desk',
    segmentId: 'SEG-L3-CORP',
    counterparties: ['CP-02'],
    notches: [7],
    avgNotch: 7.0,
    roundedNotch: 7,
    avgRating: 'A-',
    color: 'text-purple-400',
    colorBg: 'bg-purple-500/10 border-purple-500/20',
  },
];

/* ── Portfolio-level data ────────────────────────────────────────────────── */

export interface ExtRatingPortfolioRow {
  portfolioName: string;
  distinctCounterparties: string[];
  notches: number[];
  avgNotch: number;
  roundedNotch: number;
  avgRating: string;
}

/*
 * Math verification:
 *   Portfolio: DISTINCT counterparties = [CP-01(8), CP-02(7)]
 *   AVG = (8+7)/2 = 7.5 → ROUND = 8 → BBB+
 */
export const PORTFOLIO_ROW: ExtRatingPortfolioRow = {
  portfolioName: 'Commercial Real Estate',
  distinctCounterparties: ['CP-01', 'CP-02'],
  notches: [8, 7],
  avgNotch: 7.5,
  roundedNotch: 8,
  avgRating: 'BBB+',
};

/* ── Business Segment-level data ─────────────────────────────────────────── */

export interface ExtRatingLoBRow {
  lobName: string;
  distinctCounterparties: string[];
  notches: number[];
  avgNotch: number;
  roundedNotch: number;
  avgRating: string;
}

/*
 * Math verification:
 *   LoB: DISTINCT counterparties = [CP-01(8), CP-02(7)]
 *   AVG = (8+7)/2 = 7.5 → ROUND = 8 → BBB+
 */
export const LOB_ROW: ExtRatingLoBRow = {
  lobName: 'Commercial Banking',
  distinctCounterparties: ['CP-01', 'CP-02'],
  notches: [8, 7],
  avgNotch: 7.5,
  roundedNotch: 8,
  avgRating: 'BBB+',
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Get the color class for a rating based on notch */
export function ratingColor(notch: number): string {
  if (notch <= 4) return 'text-emerald-400';
  if (notch <= 7) return 'text-green-400';
  if (notch <= 10) return 'text-yellow-400';
  if (notch <= 13) return 'text-amber-400';
  if (notch <= 16) return 'text-orange-400';
  return 'text-red-400';
}

/** Get the bg color class for a rating based on notch */
export function ratingBg(notch: number): string {
  if (notch <= 4) return 'bg-emerald-500/10';
  if (notch <= 7) return 'bg-green-500/10';
  if (notch <= 10) return 'bg-yellow-500/10';
  if (notch <= 13) return 'bg-amber-500/10';
  if (notch <= 16) return 'bg-orange-500/10';
  return 'bg-red-500/10';
}

/** Whether a notch is investment grade */
export function isIG(notch: number): boolean {
  return notch <= 10;
}
