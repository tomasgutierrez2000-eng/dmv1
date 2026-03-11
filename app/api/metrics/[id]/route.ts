import { NextRequest, NextResponse } from 'next/server';
import { getMergedMetrics, readCustomMetrics, writeCustomMetrics } from '@/lib/metrics-store';
import type { L3Metric } from '@/data/l3-metrics';
import { normalizeMetric, validateMetric } from '@/lib/metrics-calculation';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';

/** GET one metric */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const merged = getMergedMetrics();
  const metric = merged.find(m => m.id === id);
  if (!metric) return jsonError('Metric not found', { status: 404 });
  return jsonSuccess({ ...metric, source: 'custom' });
}

/** PUT: update a metric */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Partial<L3Metric>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', { status: 400 });
  }

  const validation = validateMetric({ ...body, id });
  if (!validation.ok) {
    return jsonError(validation.error ?? 'Validation failed', { status: 400 });
  }

  const custom = readCustomMetrics();
  const index = custom.findIndex(m => m.id === id);
  const existing = index >= 0 ? custom[index] : null;
  const metric = normalizeMetric({ ...existing, ...body }, id);
  if (index >= 0) {
    custom[index] = metric;
  } else {
    custom.push(metric);
  }
  try {
    writeCustomMetrics(custom);
  } catch (err) {
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
  return jsonSuccess({ ...metric, source: 'custom' });
}

/** DELETE: remove a metric */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const custom = readCustomMetrics();
  const filtered = custom.filter(m => m.id !== id);
  if (filtered.length === custom.length) {
    return jsonError('Metric not found', { status: 404 });
  }
  try {
    writeCustomMetrics(filtered);
  } catch (err) {
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
  return new NextResponse(null, { status: 204 });
}
