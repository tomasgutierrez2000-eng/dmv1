export interface AmendmentEvent {
  amendment_event_id: string;
  credit_agreement_id: string;
  facility_id: string | null;
  amendment_type: string;
  amendment_subtype: string;
  amendment_status: string;
  counterparty_id: string;
  identified_date: string;
  effective_date: string | null;
  completed_date: string | null;
  amendment_description: string;
  as_of_date: string;
}
