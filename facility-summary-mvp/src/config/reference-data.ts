export const LOB_HIERARCHY = [
  {
    l1: "Corporate Banking",
    l2: [
      "Large Corporate Banking",
      "Middle Market Banking",
      "Small Business Banking",
      "Specialized Industries",
      "Asset-Based Lending",
      "Trade Finance",
    ],
  },
  {
    l1: "Commercial Real Estate",
    l2: [
      "Office",
      "Multi-Family",
      "Retail",
      "Industrial / Logistics",
      "Hospitality",
      "Self-Storage",
      "Mixed-Use",
      "Construction / Development",
      "Healthcare Real Estate",
      "Student Housing",
    ],
  },
  {
    l1: "Investment Banking",
    l2: [
      "Mergers & Acquisitions (Advisory)",
      "Equity Capital Markets",
      "Debt Capital Markets",
      "Leveraged Finance",
      "Sponsor Coverage",
      "Structured Finance",
    ],
  },
  {
    l1: "Global Markets",
    l2: [
      "Fixed Income (Rates, Credit)",
      "Equities Trading",
      "Foreign Exchange",
      "Commodities",
      "Structured Products",
      "Prime Brokerage",
      "Securities Financing (Repo / SFT)",
    ],
  },
  {
    l1: "Wealth Management",
    l2: [
      "Private Banking",
      "Investment Advisory",
      "Family Office Services",
      "Margin Lending",
      "Ultra-High-Net-Worth",
    ],
  },
  {
    l1: "Asset Management",
    l2: [
      "Institutional Asset Management",
      "Retail / Mutual Funds",
      "Alternatives (Private Credit, PE, Real Assets)",
    ],
  },
  {
    l1: "Retail Banking",
    l2: [
      "Residential Mortgages",
      "Home Equity / HELOC",
      "Credit Cards",
      "Auto Loans",
      "Personal Loans",
      "Consumer Deposits",
    ],
  },
  {
    l1: "Public Sector",
    l2: [
      "Sovereigns",
      "Central Banks",
      "Agencies & GSEs",
      "Municipal Finance",
      "Multilateral Institutions",
    ],
  },
  {
    l1: "Other / Corporate",
    l2: [
      "Intercompany / Intragroup",
      "Legacy Portfolios",
      "Wind-Down Units",
      "Corporate Investments",
    ],
  },
];

export const FACILITY_TYPES = [
  "Revolving Credit Facility",
  "Bilateral Term Loan",
  "Syndicated Term Loan",
  "Letter of Credit Facility",
  "Bridge Loan",
  "ISDA Master Agreement",
  "Master Netting Agreement",
  "Securities Lending Agreement",
  "Asset-Based Lending",
  "Trade Finance Facility",
];

export const PRODUCTS = [
  "Loans",
  "Commitments",
  "Securities Debt",
  "Securities Equity",
  "Derivatives",
  "SFT",
  "Guarantees/LC",
  "Securitization",
];

export const FR2590_CATEGORIES = [
  { code: "G1", name: "G-1 General Exposures" },
  { code: "G2", name: "G-2 Repurchase Agreements" },
  { code: "G3", name: "G-3 Securities Lending / Borrowing" },
  { code: "G4", name: "G-4 Derivatives" },
  { code: "G5", name: "G-5 Risk-Shifting Exposures" },
];

export const PRODUCT_TO_FR2590: Record<string, string> = {
  Loans: "G1",
  Commitments: "G1",
  "Securities Debt": "G1",
  "Securities Equity": "G1",
  "Guarantees/LC": "G1",
  Securitization: "G1",
  SFT: "G2",
  Derivatives: "G4",
};

export const REGIONS = ["North America", "EMEA", "APAC", "LATAM"];

export const INDUSTRIES = [
  { id: "IND-001", name: "Technology", code: "5112" },
  { id: "IND-002", name: "Healthcare", code: "6211" },
  { id: "IND-003", name: "Energy", code: "2111" },
  { id: "IND-004", name: "Financial Services", code: "5221" },
  { id: "IND-005", name: "Manufacturing", code: "3361" },
  { id: "IND-006", name: "Real Estate", code: "5311" },
  { id: "IND-007", name: "Consumer Goods", code: "4451" },
  { id: "IND-008", name: "Telecommunications", code: "5171" },
  { id: "IND-009", name: "Utilities", code: "2211" },
  { id: "IND-010", name: "Transportation", code: "4811" },
];

export const MITIGANT_SUBTYPES: Record<string, string[]> = {
  "M-1": [
    "Cash",
    "Sovereign Debt",
    "Other Debt",
    "Equity (Main Index)",
    "Haircut-adjusted values",
  ],
  "M-2": [
    "Eligible Guarantees Received",
    "Eligible Credit Derivatives",
    "Other Eligible Hedges",
    "Unused portion of commitments",
  ],
};

export const LEGAL_ENTITIES = [
  {
    id: "LE-001",
    name: "Global Bank Holdings, Inc.",
    shortName: "Bank Holding Co",
    type: "BHC",
  },
  {
    id: "LE-002",
    name: "Global Commercial Bank, N.A.",
    shortName: "Commercial Bank Sub",
    type: "BANK",
  },
  {
    id: "LE-003",
    name: "Global Investment Bank, LLC",
    shortName: "Investment Bank Sub",
    type: "BROKER_DEALER",
  },
  {
    id: "LE-004",
    name: "Global Treasury Services, LLC",
    shortName: "Treasury Services LLC",
    type: "BANK",
  },
  {
    id: "LE-005",
    name: "Global Wealth Management, LLC",
    shortName: "Wealth Management LLC",
    type: "BANK",
  },
  {
    id: "LE-006",
    name: "Global Asset Management Co.",
    shortName: "Asset Management Co",
    type: "BANK",
  },
];

export const AMENDMENT_TYPES: Record<string, string[]> = {
  "Commitment Changes": [
    "Increase / Upside",
    "Decrease / Partial Reduction",
    "Accordion Activation",
  ],
  "Pricing Amendments": [
    "Margin Increase",
    "Margin Decrease",
    "Fee Structure Changes",
    "Benchmark Transition (LIBOR -> SOFR)",
  ],
  "Tenor / Maturity Change": ["Extension", "Shortening", "Evergreen provision"],
  "Amortization Profile": ["Schedule Change", "Bullet Conversion"],
  "Currency Change": ["Base Currency Switch", "Multi-currency addition"],
};

export const AMENDMENT_STATUSES = [
  "Prospect Identified",
  "In Underwriting",
  "Under Credit Review",
  "Pending Approval",
  "Complete",
  "Rejected",
];

export const EXTERNAL_RATINGS = ["CCC", "B", "BB", "BBB", "A", "AA"];

export const PORTFOLIOS = [
  "Investment Grade",
  "High Yield",
  "Commercial",
  "Emerging Markets",
  "Leveraged",
  "Distressed",
];

// Rate index codes
export const RATE_INDEX_CODES = ["SOFR", "PRIME", "FIXED"];

// Delinquency codes
export const DELINQUENCY_STATUS_CODES = ["CURRENT", "DELINQUENT", "NPL"];
export const DELINQUENCY_BUCKET_CODES = ["0", "1-29", "30-59", "60-89", "90+"];

// Risk flag codes
export const RISK_FLAG_CODES = [
  "DETERIORATED",
  "WATCH_LIST",
  "COVENANT_BREACH",
  "BELOW_THRESHOLD_SPREAD",
  "CRITICIZED",
];
export const RISK_FLAG_SCOPE = ["FACILITY", "COUNTERPARTY"];
export const RISK_FLAG_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Rating agencies
export const RATING_AGENCIES = ["Internal", "S&P", "Moodys", "Fitch"];
export const RATING_TYPES = ["INTERNAL", "EXTERNAL"];

// Limit types
export const LIMIT_TYPES = [
  "Single Counterparty",
  "Sector Concentration",
  "LoB Concentration",
];
export const LIMIT_SCOPE = ["COUNTERPARTY", "LOB_L2"];
export const RISK_TIERS = [
  "Tier 1 (25% Limit)",
  "Tier 1 (15% Limit)",
  "Limit Amount (Absolute)",
];

// Financial metric codes
export const FINANCIAL_METRIC_CODES = [
  { code: "DSCR", name: "Debt Service Coverage Ratio" },
  { code: "LTV", name: "Loan-to-Value" },
  { code: "FCCR", name: "Fixed-Charge Coverage Ratio" },
  { code: "LCR", name: "Liquidity Coverage Ratio" },
  { code: "CAR", name: "Capital Adequacy Ratio" },
  { code: "TNW", name: "Tangible Net Worth" },
];
