/**
 * Remediation Module — testable TypeScript library for the remediation agents.
 *
 * Agents (db-diagnostician.md, remediation-engine.md, fix-verifier.md) call
 * these functions via `npx tsx`. The agents provide orchestration and LLM
 * reasoning for ambiguous cases; this module provides deterministic logic.
 *
 * Architecture:
 *   Agent MDs (orchestration + LLM)  →  This module (deterministic TS)
 *        ↓                                      ↓
 *   Ambiguous fixes (STORY_VIOLATION)    Deterministic fixes (FK_ORPHAN, CASCADE_BREAK)
 */

export { type DiagnosisFinding, type DiagnosisReport, type FixCategory, type Severity } from './types';
export { type RemediationFix, type RemediationReport, type FixStatus } from './types';
export { type VerificationResult, type VerificationReport } from './types';

export {
  DIAGNOSTIC_FK_CHECKS,
  generateFKOrphanSQL,
  createFKOrphanFinding,
  generateReconciliationSQL,
  createReconciliationFinding,
  generateCascadeSQL,
  createCascadeFinding,
  createSchemaDriftFinding,
  resetFindingCounter,
} from './diagnostics';
