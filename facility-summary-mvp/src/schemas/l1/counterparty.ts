export interface Counterparty {
  counterparty_id: string;
  legal_name: string;
  counterparty_type: string;
  internal_risk_rating: number;
  external_rating_sp: string;
  industry_id: string;
  country_code: string;
  is_parent_flag: boolean;
  pd_annual: number;
  lgd_unsecured: number;
}
