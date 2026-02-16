export interface FacilityDelinquencySnapshot {
  delinquency_snapshot_id: string;
  facility_id: string;
  counterparty_id: string;
  as_of_date: string;
  overdue_principal_amt: number;
  overdue_interest_amt: number;
  total_overdue_amt: number;
  days_past_due_max: number;
  delinquency_status_code: string;
  delinquency_bucket_code: string;
}
