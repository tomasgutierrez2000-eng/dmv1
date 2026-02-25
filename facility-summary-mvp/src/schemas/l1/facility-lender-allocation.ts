export interface FacilityLenderAllocation {
  lender_allocation_id: string;
  facility_id: string;
  legal_entity_id: string;
  bank_share_pct: number;
  bank_commitment_amt: number;
  allocation_role: string;
  is_lead_flag: boolean;
}
