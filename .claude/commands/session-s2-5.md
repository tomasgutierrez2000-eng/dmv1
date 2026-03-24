Build the remaining 7 Decomposition Expert agents — Session S2.5 of the GSIB Agent Suite.

## Prerequisites Check (MANDATORY — halt if any fail)

1. `.claude/commands/experts/decomp-credit-risk.md` — MUST exist (from S1). This is the reference implementation. **If missing, halt: "S2.5 requires S1 (Credit Risk Decomp Expert) as the template. Run /session-s1 first."**
2. `.claude/config/bank-profile.yaml` — must exist (from S0)
3. `.claude/config/schema-manifest.yaml` — must exist (from S0)
4. `.claude/audit/audit_logger.py` — must exist (from S0)

## Your First Actions

1. Read CLAUDE.md completely.
2. Read `.claude/commands/experts/decomp-credit-risk.md` — this is the REFERENCE. Every expert you build MUST follow the exact same output format and behavioral pattern.
3. Read `.claude/config/bank-profile.yaml` and `.claude/config/schema-manifest.yaml` (summary).
4. Read `.claude/audit/audit_logger.py`

## Clarifying Questions

Q1. Build all 7 in this session (confirming each before the next), or the 2-3 most urgent first?

Q2. Specific metrics within any stripe that are particularly important? (e.g., LCR/NSFR for liquidity, CVA for CCR, FRTB for market risk)

Q3. For Market Risk — IMA, SA, or both for FRTB?

Q4. For Operational Risk — AMA, BIA, or SMA (Basel IV)?

Q5. For Compliance — US-only or also EU/ECB (CRR2, SREP)?

## After Answers, Build 7 Files (confirm each before next)

Build in this order:
1. `experts/decomp-market-risk.md` — FRTB, VaR, ES, Greeks, SBM, DRC, RRAO
2. `experts/decomp-ccr.md` — SA-CCR, CVA, PFE, EPE, wrong-way risk
3. `experts/decomp-liquidity.md` — LCR, NSFR, HQLA, FR 2052a, intraday
4. `experts/decomp-capital.md` — CET1, T1, RWA, SLR, TLAC, buffers
5. `experts/decomp-irrbb-alm.md` — NII/EVE sensitivity, repricing gap, FTP
6. `experts/decomp-oprisk.md` — SMA, loss events, KRI, RCSA
7. `experts/decomp-compliance.md` — Regulatory ratios, DFAST/CCAR, living will

Every file MUST use the IDENTICAL output format as `decomp-credit-risk.md`. Show each file and get approval before writing and before moving to the next.
