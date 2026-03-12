/**
 * Deploy Engine — takes validated metrics and integrates them into the data model.
 *
 * Pipeline:
 *   1. Generate YAML → write file
 *   2. Write Python calculator file (if provided — simple scaffold or full mode)
 *   3. Update calculators/__init__.py to register new module
 *   4. Run calc:sync (YAML → catalogue + Excel)
 *   5. Verify catalogue entries exist
 *   6. Auto-populate demo data from live PostgreSQL (no user opt-in needed)
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
  pythonFiles?: Map<string, { content: string; mode: 'full' | 'simple' }>;
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

// ═══════════════════════════════════════════════════════════════
// Python Calculator Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Convert metric ID to Python module name.
 * e.g. "EXP-050" → "exp_050"
 */
export function metricIdToModuleName(metricId: string): string {
  return metricId.toLowerCase().replace(/-/g, '_');
}

/**
 * Convert metric ID to Python class name.
 * e.g. "EXP-050" → "Exp050Calculator"
 */
export function metricIdToClassName(metricId: string): string {
  // Split on hyphens, capitalize first letter of each part, join without separator
  const parts = metricId.split('-');
  const pascal = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
  return `${pascal}Calculator`;
}

/**
 * Scaffold a simple calculator: wraps a user-provided `facility_level` function
 * in a full BaseCalculator subclass with auto-generated counterparty and desk rollups.
 */
export function scaffoldSimpleCalculator(
  metricId: string,
  catalogueId: string,
  name: string,
  simpleCode: string
): string {
  const className = metricIdToClassName(metricId);

  return `\
"""${name} calculator — auto-scaffolded from simple mode."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd

from ..registry import register
from .base import BaseCalculator, filter_by_date

if TYPE_CHECKING:
    from ..data_loader import DataLoader


# ── User-provided facility_level logic ──────────────────────────
${simpleCode}


@register
class ${className}(BaseCalculator):
    metric_id = "${metricId}"
    catalogue_id = "${catalogueId}"
    name = "${name}"

    def facility_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        return facility_level(loader, as_of_date)

    def counterparty_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L2", "facility_master")[["facility_id", "counterparty_id"]]
        merged = fac.merge(fm, on="facility_id", how="inner")
        val_col = self.primary_value_column()
        return merged.groupby("counterparty_id", as_index=False).agg(
            **{val_col: (val_col, "sum")}
        )

    def desk_level(self, loader: DataLoader, as_of_date: str) -> pd.DataFrame:
        fac = self.facility_level(loader, as_of_date)
        fm = loader.load_table("L2", "facility_master")[["facility_id", "lob_segment_id"]]
        ebt = loader.load_table("L1", "enterprise_business_taxonomy")
        level_col = "tree_level" if "tree_level" in ebt.columns else "level"
        name_col = "segment_name" if "segment_name" in ebt.columns else "description"
        desks = ebt.loc[
            ebt[level_col].astype(str).isin(["L3", "3"]),
            ["managed_segment_id", name_col],
        ].rename(columns={"managed_segment_id": "lob_segment_id", name_col: "segment_name"})
        merged = fac.merge(fm, on="facility_id", how="inner").merge(desks, on="lob_segment_id", how="left")
        val_col = self.primary_value_column()
        return (
            merged.groupby(["lob_segment_id", "segment_name"], as_index=False)
            .agg(**{val_col: (val_col, "sum")})
            .rename(columns={"lob_segment_id": "segment_id"})
        )
`;
}

/**
 * Prepare a full calculator file: ensure @register decorator and relative imports.
 */
export function prepareFullCalculator(
  content: string,
  metricId: string,
  catalogueId: string
): string {
  let processed = content;

  // Fix absolute imports to relative
  processed = processed.replace(
    /from\s+scripts\.calc_engine\.registry\s+import\s+register/g,
    'from ..registry import register'
  );
  processed = processed.replace(
    /from\s+scripts\.calc_engine\.calculators\.base\s+import/g,
    'from .base import'
  );
  processed = processed.replace(
    /from\s+scripts\.calc_engine\.data_loader\s+import/g,
    'from ..data_loader import'
  );

  // Ensure @register decorator is present before the class definition
  // Match "class XxxCalculator" that is NOT preceded by @register
  if (!/@register\s*\nclass\s/m.test(processed)) {
    processed = processed.replace(
      /^(class\s+\w+Calculator\s*\()/m,
      '@register\n$1'
    );
  }

  // Ensure the register import exists
  if (!/from\s+\.\.registry\s+import\s+register/.test(processed)) {
    // Add it after the last import line
    const lines = processed.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^(from\s|import\s)/.test(lines[i].trim())) {
        lastImportIdx = i;
      }
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, 'from ..registry import register');
    } else {
      lines.unshift('from ..registry import register');
    }
    processed = lines.join('\n');
  }

  return processed;
}

/**
 * Update the calculators __init__.py to include a new module import, inserted
 * alphabetically into the existing grouped import block.
 */
export function updateInitPy(initPyContent: string, newModuleName: string): string {
  const lines = initPyContent.split('\n');

  // Find the main "from . import (" block and extract the module names
  let blockStart = -1;
  let blockEnd = -1;
  const moduleNames: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect the opening of the grouped import
    if (/^from\s+\.\s+import\s+\(/.test(line.trim())) {
      blockStart = i;
      continue;
    }
    if (blockStart >= 0 && blockEnd < 0) {
      const trimmed = line.trim();
      if (trimmed === ')') {
        blockEnd = i;
        continue;
      }
      // Extract module name (strip trailing comma and comments)
      const match = trimmed.match(/^([a-z_][a-z0-9_]*)/);
      if (match) {
        moduleNames.push(match[1]);
      }
    }
  }

  if (blockStart < 0 || blockEnd < 0) {
    // Fallback: just append the import at the top
    return `from . import ${newModuleName}  # noqa: F401\n${initPyContent}`;
  }

  // Skip if already present
  if (moduleNames.includes(newModuleName)) {
    return initPyContent;
  }

  // Insert alphabetically
  moduleNames.push(newModuleName);
  moduleNames.sort();

  // Rebuild the block
  const newBlock = [
    lines[blockStart], // "from . import (  # noqa: F401"
    ...moduleNames.map((m) => `    ${m},`),
    ')',
  ];

  // Replace the old block (blockStart through blockEnd inclusive)
  const result = [
    ...lines.slice(0, blockStart),
    ...newBlock,
    ...lines.slice(blockEnd + 1),
  ];

  return result.join('\n');
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
    const hasPython = options.pythonFiles?.has(metricId) ?? false;

    const step = await runStep(`Write YAML: ${metricId}`, async () => {
      const yamlOpts = hasPython ? { hasPythonCalculator: true } : undefined;
      const yaml = generateYamlFromUpload(metric, yamlOpts);
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

  // Step 2: Write Python calculator files
  if (options.pythonFiles && options.pythonFiles.size > 0) {
    for (const [metricId, pyInfo] of Array.from(options.pythonFiles)) {
      const moduleName = metricIdToModuleName(metricId);
      const relPath = `scripts/calc_engine/calculators/${moduleName}.py`;

      const step = await runStep(`Write Python: ${metricId}`, async () => {
        const metric = metrics.find((m) => m.metric_id === metricId);
        const catalogueId = (metric as unknown as Record<string, unknown>)?.catalogue_id as string ?? metricId;
        const name = metric?.name ?? metricId;

        let pythonContent: string;
        if (pyInfo.mode === 'simple') {
          pythonContent = scaffoldSimpleCalculator(metricId, catalogueId, name, pyInfo.content);
        } else {
          pythonContent = prepareFullCalculator(pyInfo.content, metricId, catalogueId);
        }

        if (options.dryRun) {
          return `[dry-run] Would write ${relPath} (${pythonContent.length} chars, ${pyInfo.mode} mode)`;
        }

        const absPath = path.join(root, relPath);
        const dir = path.dirname(absPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const existed = fs.existsSync(absPath);
        fs.writeFileSync(absPath, pythonContent, 'utf-8');
        return existed ? `Updated ${relPath}` : `Created ${relPath} (${pyInfo.mode} mode)`;
      });
      steps.push(step);
    }

    // Step 3: Update __init__.py to register new modules
    const initStep = await runStep('Update calculators __init__.py', async () => {
      const initPyPath = path.join(root, 'scripts/calc_engine/calculators/__init__.py');

      if (options.dryRun) {
        const moduleNames = Array.from(options.pythonFiles!.keys())
          .map(metricIdToModuleName);
        return `[dry-run] Would add ${moduleNames.join(', ')} to __init__.py`;
      }

      if (!fs.existsSync(initPyPath)) {
        throw new Error('calculators/__init__.py not found');
      }

      let content = fs.readFileSync(initPyPath, 'utf-8');
      for (const metricId of Array.from(options.pythonFiles!.keys())) {
        const moduleName = metricIdToModuleName(metricId);
        content = updateInitPy(content, moduleName);
      }
      fs.writeFileSync(initPyPath, content, 'utf-8');
      return `Registered ${options.pythonFiles!.size} module(s) in __init__.py`;
    });
    steps.push(initStep);
  }

  // Step 4: Run calc:sync (YAML → catalogue + Excel)
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

  // Step 5: Verify catalogue entries
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

  // Step 6: Auto-populate demo data from live database
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
