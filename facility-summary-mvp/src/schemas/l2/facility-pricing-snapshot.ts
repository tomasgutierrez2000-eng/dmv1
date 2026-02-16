export interface FacilityPricingSnapshot {
  facility_pricing_id: string;
  facility_id: string;
  as_of_date: string;
  base_rate_pct: number;
  spread_bps: number;
  all_in_rate_pct: number;
  rate_index_code: string;
  rate_cap_pct: number | null;
  min_spread_threshold_bps: number;
  below_threshold_flag: boolean;
}
