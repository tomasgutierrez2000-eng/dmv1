export interface CounterpartyHierarchy {
  counterparty_id: string;
  as_of_date: string;
  immediate_parent_id: string | null;
  ultimate_parent_id: string;
  ownership_pct: number;
}
