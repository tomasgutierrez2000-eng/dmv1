/**
 * Deploy Engine — takes validated metrics and integrates them into the data model.
 *
 * Pipeline:
 *   1. Generate YAML → write file
 *   2. Run calc:sync (YAML → catalogue + Excel)
 *   3. Verify catalogue entries exist
 *   4. Auto-populate demo data from live PostgreSQL (no user opt-in needed)
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { generateYamlFromUpload, getYamlFilePath } from './yaml-generator';
import { getCatalogueItem } from './store';
import { generateAndPersistDemoData } from './live-demo-query';
import type { MetricWithSources } from './template-parser';

const execFileAsync = promisify(execFile);

export interface DeployStep {
  name: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  details?: string;
  duration_ms: number;
}

export interface DeployResult {
  steps: DeployStep[];
  overall: 'success' | 'partial' | 'failed';
  deployed_metrics: string[];
}

interface DeployOptions {
  dryRun: boolean;
}

/** Get the project root (where package.json lives). */
function getProjectRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

async function runStep(
  name: string,
  fn: () => Promise<string>
): Promise<DeployStep> {
  const start = Date.now();
  try {
    const message = await fn();
    return { name, status: 'success', message, duration_ms: Date.now() - start };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name, status: 'failed', message, duration_ms: Date.now() - start };
  }
}

/**
 * Deploy a batch of validated metrics into the data model.
 */
export async function deployMetrics(
  metrics: MetricWithSources[],
  options: DeployOptions
): Promise<DeployResult> {
  const root = getProjectRoot();
  const steps: DeployStep[] = [];
  const deployedIds: string[] = [];

  // Step 1: Generate and write YAML files
  for (const metric of metrics) {
    const metricId = metric.metric_id;
    const domain = metric.domain || 'general';

    const step = await runStep(`Write YAML: ${metricId}`, async () => {
      const yaml = generateYamlFromUpload(metric);
      const relPath = getYamlFilePath(metricId, domain);
      const absPath = path.join(root, relPath);

      if (options.dryRun) {
        return `[dry-run] Would write ${relPath} (${yaml.length} chars)`;
      }

      // Ensure directory exists
      const dir = path.dirname(absPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const existed = fs.existsSync(absPath);
      fs.writeFileSync(absPath, yaml, 'utf-8');
      return existed ? `Updated ${relPath}` : `Created ${relPath}`;
    });
    steps.push(step);

    if (step.status === 'success') {
      deployedIds.push(metricId);
    }
  }

  // Step 2: Run calc:sync (YAML → catalogue + Excel)
  if (deployedIds.length > 0 && !options.dryRun) {
    const syncStep = await runStep('Run calc:sync', async () => {
      const { stdout, stderr } = await execFileAsync(
        'npx',
        ['tsx', 'scripts/calc_engine/sync-yaml-to-catalogue.ts'],
        { cwd: root, timeout: 60_000 }
      );
      const out = (stdout + '\n' + stderr).trim();
      return out || 'Sync completed';
    });
    steps.push(syncStep);
  } else if (options.dryRun) {
    steps.push({
      name: 'Run calc:sync',
      status: 'skipped',
      message: '[dry-run] Would run calc:sync',
      duration_ms: 0,
    });
  }

  // Step 3: Verify catalogue entries
  if (!options.dryRun) {
    const verifyStep = await runStep('Verify catalogue', async () => {
      const found: string[] = [];
      const missing: string[] = [];
      for (const id of deployedIds) {
        const item = getCatalogueItem(id);
        if (item) found.push(id);
        else missing.push(id);
      }
      if (missing.length > 0) {
        throw new Error(`Catalogue entries missing for: ${missing.join(', ')}`);
      }
      return `Verified ${found.length} catalogue entries`;
    });
    steps.push(verifyStep);
  }

  // Step 4: Auto-populate demo data from live database
  if (!options.dryRun && deployedIds.length > 0) {
    const demoStep = await runStep('Populate demo data from DB', async () => {
      const results: string[] = [];
      for (const metricId of deployedIds) {
        const ok = await generateAndPersistDemoData(metricId);
        results.push(ok ? `${metricId}: ✓` : `${metricId}: skipped (no DB)`);
      }
      return results.join(', ');
    });
    steps.push(demoStep);
  } else if (options.dryRun) {
    steps.push({
      name: 'Populate demo data from DB',
      status: 'skipped',
      message: '[dry-run] Would query DB for demo data',
      duration_ms: 0,
    });
  }

  // Determine overall status
  const failed = steps.filter((s) => s.status === 'failed').length;
  const succeeded = steps.filter((s) => s.status === 'success').length;
  const overall = failed === 0 ? 'success' : succeeded > 0 ? 'partial' : 'failed';

  return { steps, overall, deployed_metrics: deployedIds };
}
