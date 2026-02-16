export interface RiskFlag {
  risk_flag_id: string;
  flag_scope: string;
  facility_id: string | null;
  counterparty_id: string | null;
  flag_code: string;
  flag_severity: string;
  flag_description: string;
  as_of_date: string;
}
