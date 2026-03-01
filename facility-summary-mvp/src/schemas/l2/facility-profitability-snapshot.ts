export interface FacilityProfitabilitySnapshot {
  profitability_snapshot_id: string;
  facility_id: string;
  as_of_date: string;
  net_interest_income_amt: number;
  total_revenue_amt: number;
  operating_expense_amt: number;
  nim_pct: number;
  roa_pct: number;
  roe_pct: number;
  total_debt_service_amt: number;
  interest_rate_sensitivity_pct: number;
}
