/**
 * Stage 8: IFRS 9 Staging — determine ECL staging based on credit quality signals.
 */

import { CREDIT_STATUS_CODE } from '../types';
import type { IFRS9Stage } from '../types';
import type { IFRS9Input, IFRS9Output } from '../stage-types';

export function applyIFRS9Staging(input: IFRS9Input): IFRS9Output {
  return {
    ifrs9_stage: determineIFRS9Stage(input),
  };
}

function determineIFRS9Stage(input: IFRS9Input): IFRS9Stage {
  // Stage 3 is sticky: once assigned, it persists until an explicit cure event
  if (input.ifrs9_stage === 3) {
    const hasCureEvent = input.events_this_period.some(
      e => e.type === 'IFRS9_CURE' || e.type === 'RESTRUCTURE_CURE'
    );
    if (!hasCureEvent) return 3;
  }

  // Stage 3: DPD > 90 or DEFAULT status
  if (input.days_past_due > 90 || input.credit_status === 'DEFAULT') {
    return 3;
  }
  // Stage 2: Significant increase in credit risk (PD > 2x origination)
  if (input.pd_annual > input.pd_at_origination * 2) {
    return 2;
  }
  // Stage 2: DPD > 30
  if (input.days_past_due > 30) {
    return 2;
  }
  // Stage 2: Credit status is WATCH or worse
  if (['WATCH', 'SPECIAL_MENTION', 'SUBSTANDARD', 'DOUBTFUL'].includes(input.credit_status)) {
    const statusCode = CREDIT_STATUS_CODE[input.credit_status];
    if (statusCode >= 4) return 2; // SPECIAL_MENTION or worse
  }
  // Stage 1: Performing
  return 1;
}
