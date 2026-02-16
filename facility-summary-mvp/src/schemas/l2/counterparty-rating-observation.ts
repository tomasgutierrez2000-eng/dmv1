export interface CounterpartyRatingObservation {
  observation_id: string;
  counterparty_id: string;
  rating_type: string;
  rating_agency: string;
  rating_value: string;
  prior_rating_value: string;
  rating_date: string;
  as_of_date: string;
}
