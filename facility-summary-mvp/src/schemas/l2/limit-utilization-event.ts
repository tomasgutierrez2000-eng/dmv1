export interface LimitUtilizationEvent {
  utilization_event_id: string;
  limit_definition_id: string;
  utilized_amount_usd: number;
  as_of_date: string;
}
