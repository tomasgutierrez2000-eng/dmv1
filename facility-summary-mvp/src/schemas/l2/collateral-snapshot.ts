export interface CollateralSnapshot {
  collateral_snapshot_id: string;
  facility_id: string;
  counterparty_id: string;
  mitigant_group_code: string;
  mitigant_subtype: string;
  original_valuation_usd: number;
  current_valuation_usd: number;
  haircut_pct: number;
  eligible_value_usd: number;
  allocated_amount_usd: number;
  as_of_date: string;
}
