export interface LimitDefinition {
  limit_definition_id: string;
  limit_scope: string;
  counterparty_id: string | null;
  lob_l2_name: string | null;
  limit_type: string;
  risk_tier: string;
  limit_amount_usd: number;
  inner_threshold_pct: number;
  outer_threshold_pct: number;
  as_of_date: string;
}
