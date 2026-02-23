/**
 * Immutable append-only audit trail for Data Lineage & Source Mapping Platform.
 * Events: mapping/metric changes, validation results, user actions.
 * File-based; swap for DB with 7y+ retention when needed.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'audit');
const LOG_PATH = path.join(DATA_DIR, 'audit.log.jsonl');

export type AuditEventType =
  | 'mapping_created'
  | 'mapping_updated'
  | 'mapping_approved'
  | 'metric_updated'
  | 'validation_run'
  | 'break_identified'
  | 'break_resolved'
  | 'user_action';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  entity_type?: string;
  entity_id?: string;
  user?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function appendAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
  ensureDir();
  const full: AuditEvent = {
    ...event,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  fs.appendFileSync(LOG_PATH, JSON.stringify(full) + '\n', 'utf-8');
}

export function getAuditEvents(opts?: { limit?: number; entity_id?: string; type?: AuditEventType }): AuditEvent[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  const limit = opts?.limit ?? 100;
  const lines = fs.readFileSync(LOG_PATH, 'utf-8').trim().split('\n').filter(Boolean);
  let events: AuditEvent[] = lines
    .map((line) => {
      try {
        return JSON.parse(line) as AuditEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is AuditEvent => e != null);
  if (opts?.entity_id) events = events.filter((e) => e.entity_id === opts.entity_id);
  if (opts?.type) events = events.filter((e) => e.type === opts.type);
  return events.slice(-limit).reverse();
}
