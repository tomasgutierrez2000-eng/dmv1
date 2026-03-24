/**
 * Stage pipeline — barrel export for all 10 stages.
 */

export { applyBaseRate } from './base-rate';
export { applyDrawBehaviorStage } from './draw-behavior';
export { applyCollateralRevaluation } from './collateral';
export { applyPDUpdate } from './pd-update';
export { applySpreadUpdate } from './spread-update';
export { applyPricing } from './pricing';
export { applyCovenantTest } from './covenant-test';
export { applyIFRS9Staging } from './ifrs9';
export { applyDerivedMetrics } from './derived-metrics';
export { applyLifecycle } from './lifecycle';
