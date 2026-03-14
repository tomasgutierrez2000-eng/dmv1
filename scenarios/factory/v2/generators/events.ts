/**
 * Generator: credit_event, risk_flag, amendment_event, exception_event
 * Reads: events_this_period[] from FacilityState
 */
import type { FacilityState, FacilityStateMap, FacilityEvent, SqlRow } from '../types';
import { stateKey, CREDIT_STATUS_CODE, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { EventCooldownTracker, categorizeEvents } from '../event-engine';

export interface EventRows {
  creditEvents: SqlRow[];
  riskFlags: SqlRow[];
  amendments: SqlRow[];
  exceptions: SqlRow[];
}

export function generateEventRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  registry: IDRegistry,
): EventRows {
  const creditEvents: SqlRow[] = [];
  const riskFlags: SqlRow[] = [];
  const amendments: SqlRow[] = [];
  const exceptions: SqlRow[] = [];

  const cooldowns = new EventCooldownTracker();

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const prevDate = i > 0 ? dates[i - 1] : null;

    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const prevState = prevDate ? stateMap.get(stateKey(facId, prevDate)) ?? null : null;
      const categorized = categorizeEvents(state, prevState, date, cooldowns);

      // Credit events
      for (const evt of categorized.creditEvents) {
        const eventId = registry.allocate('credit_event', 1)[0];
        creditEvents.push({
          credit_event_id: eventId,
          counterparty_id: evt.counterparty_id,
          credit_event_type_code: mapCreditEventTypeCode(evt.type),
          event_date: evt.date,
          as_of_date: evt.date,
          event_status: 'CONFIRMED',
          event_summary: evt.description,
          event_risk_rating: state.internal_rating,
          loss_amount_usd: state.credit_status === 'DEFAULT'
            ? Math.round(state.drawn_amount * state.lgd_current * 100) / 100
            : null,
          recovery_amount_usd: null,
          currency_code: state.currency_code,
          source_system_id: FACTORY_SOURCE_SYSTEM_ID,
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }

      // Risk flags
      for (const evt of categorized.riskFlags) {
        const flagId = registry.allocate('risk_flag', 1)[0];
        riskFlags.push({
          risk_flag_id: flagId,
          facility_id: state.facility_id,
          counterparty_id: evt.counterparty_id,
          flag_type: evt.type,
          flag_code: evt.type,
          as_of_date: evt.date,
          flag_description: evt.description,
          flag_severity: evt.severity,
          flag_scope: 'FACILITY',
          flag_trigger_value: extractTriggerValue(evt),
          source_system_id: FACTORY_SOURCE_SYSTEM_ID,
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }

      // Amendments
      for (const evt of categorized.amendments) {
        const amendId = registry.allocate('amendment_event', 1)[0];
        amendments.push({
          amendment_id: amendId,
          facility_id: state.facility_id,
          credit_agreement_id: state.credit_agreement_id,
          counterparty_id: evt.counterparty_id,
          amendment_type: evt.type,
          amendment_type_code: mapAmendmentTypeCode(evt.type),
          amendment_status: 'APPROVED',
          amendment_status_code: 'APPROVED',
          amendment_description: evt.description,
          effective_date: evt.date,
          as_of_date: evt.date,
          identified_date: evt.date,
          completed_date: evt.date,
          source_system_id: FACTORY_SOURCE_SYSTEM_ID,
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }

      // Exceptions
      for (const evt of categorized.exceptions) {
        const excId = registry.allocate('exception_event', 1)[0];
        exceptions.push({
          exception_id: excId,
          facility_id: state.facility_id,
          counterparty_id: evt.counterparty_id,
          as_of_date: evt.date,
          exception_type: evt.type,
          exception_description: evt.description,
          exception_severity: evt.severity,
          exception_status: 'OPEN',
          identified_date: evt.date,
          source_system_id: FACTORY_SOURCE_SYSTEM_ID,
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }
    }
  }

  return { creditEvents, riskFlags, amendments, exceptions };
}

/** Map event types to l1.credit_event_type_dim codes (numeric VARCHAR '1'-'10'). */
function mapCreditEventTypeCode(type: string): string {
  const map: Record<string, string> = {
    FAILURE_TO_PAY: '1',
    BANKRUPTCY: '2',
    OBLIGATION_ACCELERATION: '3',
    RESTRUCTURING: '5',
    CROSS_DEFAULT: '8',
    RATING_DOWNGRADE: '10',
  };
  return map[type] ?? '1'; // Default to FAILURE_TO_PAY
}

/** Map event types to l1.amendment_type_dim codes. */
function mapAmendmentTypeCode(type: string): string {
  const map: Record<string, string> = {
    COVENANT_WAIVER: 'WAIVER',
    MATURITY_EXTENSION: 'EXTENSION',
    FACILITY_INCREASE: 'INCREASE',
    SPREAD_REDUCTION: 'PRICING',
    COLLATERAL_RELEASE: 'SECURITY',
    COVENANT_RESET: 'COVENANT',
  };
  return map[type] ?? 'FACILITY'; // Default to FACILITY
}

function extractTriggerValue(evt: FacilityEvent): number | null {
  // Try to parse a numeric value from the description
  const match = evt.description.match(/([\d.]+)%/);
  if (match) return parseFloat(match[1]);
  return null;
}
