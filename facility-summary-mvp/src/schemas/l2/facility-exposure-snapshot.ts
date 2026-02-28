export interface FacilityExposureSnapshot {
  facility_exposure_id: string;
  facility_id: string;
  counterparty_id: string;
  legal_entity_id: string;
  gross_exposure_usd: number;
  drawn_amount: number;
  undrawn_amount: number;
  ead_amount: number;
  currency_code: string;
  fr2590_category_code: string;
  as_of_date: string;
  number_of_loans: number;
  rwa_amt: number;
  allocated_equity_amt: number;
}
