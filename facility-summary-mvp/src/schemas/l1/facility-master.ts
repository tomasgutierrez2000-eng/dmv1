export interface FacilityMaster {
  facility_id: string;
  credit_agreement_id: string;
  counterparty_id: string;
  facility_type: string;
  product_id: string;
  facility_status: string;
  committed_facility_amt: number;
  origination_date: string;
  maturity_date: string;
  interest_rate_reference: string;
  revolving_flag: boolean;
  currency_code: string;
  lob_l1_name: string;
  lob_l2_name: string;
  lob_l3_name: string;
  region_code: string;
  industry_code: string;
}
