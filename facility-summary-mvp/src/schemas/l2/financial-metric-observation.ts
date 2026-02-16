export interface FinancialMetricObservation {
  observation_id: string;
  metric_code: string;
  metric_name: string;
  facility_id: string | null;
  counterparty_id: string | null;
  metric_value: number;
  as_of_date: string;
}
