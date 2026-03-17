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
  creditEventFacilityLinks: SqlRow[];
  riskFlags: SqlRow[];
  amendments: SqlRow[];
  amendmentChangeDetails: SqlRow[];
  exceptions: SqlRow[];
}

export function generateEventRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  registry: IDRegistry,
): EventRows {
  const creditEvents: SqlRow[] = [];
  const creditEventFacilityLinks: SqlRow[] = [];
  const riskFlags: SqlRow[] = [];
  const amendments: SqlRow[] = [];
  const amendmentChangeDetails: SqlRow[] = [];
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

      // Credit events + facility links
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

        // Emit facility link rows for each affected facility
        const affectedFacilities = evt.facility_ids.length > 0 ? evt.facility_ids : [facId];
        for (const linkFacId of affectedFacilities) {
          const linkId = registry.allocate('credit_event_facility_link', 1)[0];
          creditEventFacilityLinks.push({
            link_id: linkId,
            credit_event_id: eventId,
            facility_id: linkFacId,
            as_of_date: evt.date,
            source_system_id: FACTORY_SOURCE_SYSTEM_ID,
            record_source: 'DATA_FACTORY_V2',
          });
        }
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

      // Amendments + change details
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

        // Emit change detail row describing what changed
        const detailId = registry.allocate('amendment_change_detail', 1)[0];
        const { changeField, oldValue, newValue } = inferAmendmentChange(evt, prevState, state);
        amendmentChangeDetails.push({
          change_detail_id: detailId,
          amendment_id: amendId,
          change_type: changeField,
          old_value: oldValue,
          new_value: newValue,
          source_system_id: FACTORY_SOURCE_SYSTEM_ID,
          record_source: 'DATA_FACTORY_V2',
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

  return { creditEvents, creditEventFacilityLinks, riskFlags, amendments, amendmentChangeDetails, exceptions };
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
  const match = evt.description.match(/([\d.]+)%/);
  if (match) return parseFloat(match[1]);
  return null;
}

function inferAmendmentChange(
  evt: FacilityEvent,
  prevState: FacilityState | null,
  currentState: FacilityState,
): { changeField: string; oldValue: string; newValue: string } {
  switch (evt.type) {
    case 'COVENANT_WAIVER':
    case 'COVENANT_RESET':
      return {
        changeField: 'covenant_status',
        oldValue: 'BREACHED',
        newValue: evt.type === 'COVENANT_WAIVER' ? 'WAIVED' : 'RESET',
      };
    case 'MATURITY_EXTENSION':
      return {
        changeField: 'maturity_date',
        oldValue: prevState?.maturity_date ?? 'UNKNOWN',
        newValue: currentState.maturity_date,
      };
    case 'FACILITY_INCREASE':
      return {
        changeField: 'committed_amount',
        oldValue: String(prevState?.committed_amount ?? 0),
        newValue: String(currentState.committed_amount),
      };
    case 'SPREAD_REDUCTION':
      return {
        changeField: 'spread_bps',
        oldValue: String(prevState?.spread_bps ?? 0),
        newValue: String(currentState.spread_bps),
      };
    case 'COLLATERAL_RELEASE':
      return {
        changeField: 'collateral_value',
        oldValue: String(prevState?.collateral_value ?? 0),
        newValue: String(currentState.collateral_value),
      };
    default:
      return {
        changeField: evt.type.toLowerCase(),
        oldValue: 'PREVIOUS',
        newValue: 'CURRENT',
      };
  }
}
