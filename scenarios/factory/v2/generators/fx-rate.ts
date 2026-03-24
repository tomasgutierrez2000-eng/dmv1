/**
 * Generator: fx_rate
 *
 * Generates FX rate rows for every (currency, as_of_date) combination needed
 * by the exposure snapshots. Without matching fx_rate rows, metric formulas that
 * JOIN on fx.as_of_date = fes.as_of_date silently return NULL for FX conversion
 * at aggregate levels (counterparty and above).
 *
 * Uses the MarketEnvironment for base rates and applies small deterministic
 * weekly drift to simulate realistic FX movements.
 */
import type { SqlRow } from '../types';
import { FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

/** Base USD FX rates (mid-2024 levels) */
const BASE_FX_RATES: Record<string, number> = {
  USD: 1.000000,
  EUR: 1.057000,
  GBP: 1.271000,
  JPY: 0.006620,
  CHF: 0.878000,
  CAD: 0.717000,
  AUD: 0.651000,
  SGD: 0.744000,
  HKD: 0.128500,
  KRW: 0.000720,
  BRL: 0.173000,
  MXN: 0.049500,
  INR: 0.011900,
  CNY: 0.138000,
  AED: 0.272300,
};

/** Weekly drift multipliers per currency (annualized vol ÷ 52) */
const DRIFT_FACTORS: Record<string, number> = {
  USD: 0.0,
  EUR: -0.0006,
  GBP: -0.0004,
  JPY: -0.0016,
  CHF: 0.0004,
  CAD: 0.0002,
  AUD: 0.0002,
  SGD: 0.0002,
  HKD: 0.0,     // pegged
  KRW: -0.0012,
  BRL: -0.0024,
  MXN: -0.0018,
  INR: -0.0010,
  CNY: -0.0008,
  AED: 0.0,     // pegged
};

/**
 * Generate FX rate rows for all dates and currencies in use.
 *
 * @param currencies - Set of currency codes that appear in exposure data
 * @param dates - All snapshot dates that need FX coverage
 * @param registry - ID registry for allocating fx_rate_id
 */
export function generateFxRateRows(
  currencies: Set<string>,
  dates: string[],
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];
  const baseDateMs = new Date('2024-07-01').getTime();
  const msPerWeek = 7 * 24 * 3600 * 1000;

  for (const date of dates) {
    const dateMs = new Date(date).getTime();
    const weeksFromBase = (dateMs - baseDateMs) / msPerWeek;

    for (const ccy of Array.from(currencies)) {
      const baseRate = BASE_FX_RATES[ccy];
      if (baseRate === undefined) continue; // unknown currency, skip

      const drift = DRIFT_FACTORS[ccy] ?? 0;
      const rate = round(baseRate * (1.0 + drift * weeksFromBase), 10);

      const fxId = registry.allocate('fx_rate', 1)[0];
      rows.push({
        fx_rate_id: fxId,
        as_of_date: date,
        from_currency_code: ccy,
        to_currency_code: 'USD',
        rate,
        rate_type: 'SPOT',
        provider: 'DATA_FACTORY_V2',
        record_source: 'DATA_FACTORY_V2',
        load_batch_id: 'FACTORY-FX',
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
