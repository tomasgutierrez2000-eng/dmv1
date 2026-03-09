import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { jsonSuccess, jsonError } from '@/lib/api-response';

/**
 * GET /api/metrics/library/calculator-source?metric_id=CR-001
 *
 * Scans Python calculator files for a matching metric_id or catalogue_id,
 * then returns the source code of the matching calculator file.
 *
 * If no dedicated calculator exists, checks for a YAML metric definition
 * and returns the generic calculator source along with the YAML definition.
 */
export async function GET(req: NextRequest) {
  const metricId = req.nextUrl.searchParams.get('metric_id');

  if (!metricId || !/^[A-Za-z0-9_-]+$/.test(metricId)) {
    return jsonError('metric_id is required and must be alphanumeric', { status: 400 });
  }

  const calculatorsDir = path.join(process.cwd(), 'scripts', 'calc_engine', 'calculators');

  if (!fs.existsSync(calculatorsDir)) {
    return jsonSuccess({ found: false, file: null, source: null });
  }

  // 1. Check dedicated calculator .py files
  const pyFiles = fs.readdirSync(calculatorsDir).filter(
    (f) => f.endsWith('.py') && f !== '__init__.py' && f !== 'base.py' && f !== 'registry.py' && f !== 'generic.py'
  );

  for (const pyFile of pyFiles) {
    const filePath = path.join(calculatorsDir, pyFile);
    const source = fs.readFileSync(filePath, 'utf-8');

    // Check if this file's calculator matches the metric_id
    const metricIdMatch = source.match(/metric_id\s*=\s*"([^"]+)"/);
    const catalogueIdMatch = source.match(/catalogue_id\s*=\s*"([^"]+)"/);
    const legacyMatch = source.match(/_legacy_ids\s*=\s*\[([^\]]*)\]/);

    const ids = new Set<string>();
    if (metricIdMatch) ids.add(metricIdMatch[1]);
    if (catalogueIdMatch) ids.add(catalogueIdMatch[1]);
    if (legacyMatch) {
      const legacyStr = legacyMatch[1];
      for (const m of legacyStr.matchAll(/"([^"]+)"/g)) {
        ids.add(m[1]);
      }
    }

    if (ids.has(metricId)) {
      const relativePath = `scripts/calc_engine/calculators/${pyFile}`;
      return jsonSuccess({ found: true, file: relativePath, source, type: 'dedicated' });
    }
  }

  // 2. Check for YAML metric definition (uses generic calculator)
  const metricsDir = path.join(process.cwd(), 'scripts', 'calc_engine', 'metrics');
  if (fs.existsSync(metricsDir)) {
    const yamlFile = findYamlFile(metricsDir, metricId);
    if (yamlFile) {
      const yamlSource = fs.readFileSync(yamlFile, 'utf-8');
      const genericPath = path.join(calculatorsDir, 'generic.py');
      const genericSource = fs.existsSync(genericPath)
        ? fs.readFileSync(genericPath, 'utf-8')
        : null;
      const relativeYaml = path.relative(process.cwd(), yamlFile);
      return jsonSuccess({
        found: true,
        file: relativeYaml,
        source: yamlSource,
        type: 'yaml',
        genericFile: 'scripts/calc_engine/calculators/generic.py',
        genericSource,
      });
    }
  }

  return jsonSuccess({ found: false, file: null, source: null });
}

/**
 * Search YAML files for a matching metric_id or catalogue item_id.
 */
function findYamlFile(metricsDir: string, metricId: string): string | null {
  const dirs = fs.readdirSync(metricsDir, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    const domainDir = path.join(metricsDir, dir.name);
    const files = fs.readdirSync(domainDir).filter((f) => f.endsWith('.yaml'));
    for (const file of files) {
      const filePath = path.join(domainDir, file);
      // Quick check: filename match (e.g., EXP-014.yaml)
      if (file === `${metricId}.yaml`) {
        return filePath;
      }
      // Content check: metric_id or catalogue.item_id match
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const metricIdMatch = content.match(/^metric_id:\s*"?([^"\n]+)"?/m);
        const catalogueIdMatch = content.match(/item_id:\s*"?([^"\n]+)"?/m);
        if (
          (metricIdMatch && metricIdMatch[1].trim() === metricId) ||
          (catalogueIdMatch && catalogueIdMatch[1].trim() === metricId)
        ) {
          return filePath;
        }
      } catch {
        // skip unreadable files
      }
    }
  }
  return null;
}
