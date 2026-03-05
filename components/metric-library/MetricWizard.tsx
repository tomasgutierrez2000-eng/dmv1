'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Save,
  Eye,
  FileText,
  Layers,
  Sliders,
  Database,
} from 'lucide-react';
import type {
  CatalogueItem,
  CatalogueItemKind,
  MetricClass,
  UnitType,
  Direction,
  IngredientField,
  LevelDefinition,
  SourcingType,
  RollupLevelKey,
} from '@/lib/metric-library/types';
import { ROLLUP_HIERARCHY_LEVELS, ROLLUP_LEVEL_LABELS } from '@/lib/metric-library/types';
import { buildVisualizationConfig, convertDemoData } from '@/lib/metric-library/config-builder';
import DynamicMetricLineage from './DynamicMetricLineage';

/* ════════════════════════════════════════════════════════════════════════════
 * WIZARD STEPS
 * ════════════════════════════════════════════════════════════════════════════ */

type WizardStep = 'basics' | 'ingredients' | 'levels' | 'visualization' | 'preview';

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: 'basics', label: 'Basic Info', icon: FileText },
  { key: 'ingredients', label: 'Ingredient Fields', icon: Database },
  { key: 'levels', label: 'Level Definitions', icon: Layers },
  { key: 'visualization', label: 'Visualization', icon: Sliders },
  { key: 'preview', label: 'Preview', icon: Eye },
];

/* ════════════════════════════════════════════════════════════════════════════
 * DEFAULT VALUES
 * ════════════════════════════════════════════════════════════════════════════ */

function createEmptyItem(): Partial<CatalogueItem> {
  return {
    item_id: '',
    item_name: '',
    abbreviation: '',
    kind: 'METRIC' as CatalogueItemKind,
    definition: '',
    generic_formula: '',
    data_type: 'NUMERIC',
    unit_type: 'RATIO' as UnitType,
    direction: 'HIGHER_BETTER' as Direction,
    metric_class: 'CALCULATED' as MetricClass,
    domain_ids: [],
    insight: '',
    ingredient_fields: [],
    level_definitions: [],
    number_of_instances: 1,
    directly_displayed: true,
    status: 'ACTIVE' as const,
  };
}

function createEmptyIngredient(): IngredientField {
  return { layer: 'L2', table: '', field: '', description: '' };
}

function createDefaultLevelDefs(): LevelDefinition[] {
  return ROLLUP_HIERARCHY_LEVELS.map(level => ({
    level,
    dashboard_display_name: ROLLUP_LEVEL_LABELS[level],
    in_record: true,
    sourcing_type: (level === 'facility' ? 'Calc' : 'Agg') as SourcingType,
    level_logic: '',
    source_references: [],
  }));
}

/* ════════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ════════════════════════════════════════════════════════════════════════════ */

export default function MetricWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [item, setItem] = useState<Partial<CatalogueItem>>(createEmptyItem);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Initialize level definitions if empty
  if (!item.level_definitions?.length) {
    setItem(prev => ({ ...prev, level_definitions: createDefaultLevelDefs() }));
  }

  const stepIdx = STEPS.findIndex(s => s.key === currentStep);
  const canGoNext = stepIdx < STEPS.length - 1;
  const canGoPrev = stepIdx > 0;

  const updateField = useCallback(<K extends keyof CatalogueItem>(key: K, value: CatalogueItem[K]) => {
    setItem(prev => ({ ...prev, [key]: value }));
  }, []);

  // Build preview config
  const previewConfig = useMemo(() => {
    try {
      return buildVisualizationConfig(item as CatalogueItem);
    } catch {
      return null;
    }
  }, [item]);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/metrics/library/catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveResult({ ok: true, message: `Metric "${item.abbreviation}" saved successfully.` });
      } else {
        setSaveResult({ ok: false, message: data.error ?? 'Failed to save.' });
      }
    } catch (err) {
      setSaveResult({ ok: false, message: 'Network error.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/metrics/library" className="text-gray-400 hover:text-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-white">New Metric Wizard</h1>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = currentStep === step.key;
            const isComplete = i < stepIdx;
            return (
              <React.Fragment key={step.key}>
                {i > 0 && <div className={`w-8 h-px ${isComplete ? 'bg-emerald-500' : 'bg-gray-800'}`} />}
                <button
                  onClick={() => setCurrentStep(step.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-500 text-white shadow-md'
                      : isComplete
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-gray-800/50 text-gray-500'
                  }`}
                >
                  {isComplete ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {step.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[500px]">
          {currentStep === 'basics' && (
            <BasicsStep item={item} updateField={updateField} />
          )}
          {currentStep === 'ingredients' && (
            <IngredientsStep item={item} setItem={setItem} />
          )}
          {currentStep === 'levels' && (
            <LevelsStep item={item} setItem={setItem} />
          )}
          {currentStep === 'visualization' && previewConfig && (
            <VisualizationStep item={item} config={previewConfig} />
          )}
          {currentStep === 'preview' && (
            <PreviewStep item={item as CatalogueItem} />
          )}
        </div>

        {/* Navigation + Save */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
          <button
            onClick={() => canGoPrev && setCurrentStep(STEPS[stepIdx - 1].key)}
            disabled={!canGoPrev}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-3">
            {currentStep === 'preview' && (
              <button
                onClick={handleSave}
                disabled={saving || !item.item_id || !item.abbreviation}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Metric'}
              </button>
            )}

            {saveResult && (
              <span className={`text-sm ${saveResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {saveResult.message}
              </span>
            )}

            <button
              onClick={() => canGoNext && setCurrentStep(STEPS[stepIdx + 1].key)}
              disabled={!canGoNext}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * STEP 1: BASICS
 * ════════════════════════════════════════════════════════════════════════════ */

function BasicsStep({
  item,
  updateField,
}: {
  item: Partial<CatalogueItem>;
  updateField: <K extends keyof CatalogueItem>(key: K, value: CatalogueItem[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white mb-4">Basic Information</h2>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Item ID" required>
          <input
            type="text"
            value={item.item_id ?? ''}
            onChange={e => updateField('item_id', e.target.value)}
            placeholder="e.g. LTV, DSCR, PD"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          />
        </FormField>

        <FormField label="Abbreviation" required>
          <input
            type="text"
            value={item.abbreviation ?? ''}
            onChange={e => updateField('abbreviation', e.target.value)}
            placeholder="e.g. LTV"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          />
        </FormField>
      </div>

      <FormField label="Metric Name" required>
        <input
          type="text"
          value={item.item_name ?? ''}
          onChange={e => updateField('item_name', e.target.value)}
          placeholder="e.g. Loan-to-Value Ratio"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
      </FormField>

      <FormField label="Definition">
        <textarea
          value={item.definition ?? ''}
          onChange={e => updateField('definition', e.target.value)}
          rows={3}
          placeholder="Business definition of this metric..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none resize-none"
        />
      </FormField>

      <FormField label="Generic Formula" required>
        <input
          type="text"
          value={item.generic_formula ?? ''}
          onChange={e => updateField('generic_formula', e.target.value)}
          placeholder="e.g. Committed_Amt / Collateral_Value × 100"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Kind">
          <select
            value={item.kind ?? 'METRIC'}
            onChange={e => updateField('kind', e.target.value as CatalogueItemKind)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="METRIC">METRIC</option>
            <option value="DATA_ELEMENT">DATA_ELEMENT</option>
          </select>
        </FormField>

        <FormField label="Metric Class">
          <select
            value={item.metric_class ?? 'CALCULATED'}
            onChange={e => updateField('metric_class', e.target.value as MetricClass)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="SOURCED">SOURCED</option>
            <option value="CALCULATED">CALCULATED</option>
            <option value="HYBRID">HYBRID</option>
          </select>
        </FormField>

        <FormField label="Unit Type">
          <select
            value={item.unit_type ?? 'RATIO'}
            onChange={e => updateField('unit_type', e.target.value as UnitType)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="RATIO">RATIO</option>
            <option value="PERCENTAGE">PERCENTAGE</option>
            <option value="CURRENCY">CURRENCY</option>
            <option value="COUNT">COUNT</option>
            <option value="RATE">RATE</option>
            <option value="ORDINAL">ORDINAL</option>
            <option value="DAYS">DAYS</option>
            <option value="INDEX">INDEX</option>
          </select>
        </FormField>

        <FormField label="Direction">
          <select
            value={item.direction ?? 'HIGHER_BETTER'}
            onChange={e => updateField('direction', e.target.value as Direction)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="HIGHER_BETTER">HIGHER_BETTER</option>
            <option value="LOWER_BETTER">LOWER_BETTER</option>
            <option value="NEUTRAL">NEUTRAL</option>
          </select>
        </FormField>
      </div>

      <FormField label="Insight (one-liner)">
        <input
          type="text"
          value={item.insight ?? ''}
          onChange={e => updateField('insight', e.target.value)}
          placeholder="Short insight about this metric..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
        />
      </FormField>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * STEP 2: INGREDIENT FIELDS
 * ════════════════════════════════════════════════════════════════════════════ */

function IngredientsStep({
  item,
  setItem,
}: {
  item: Partial<CatalogueItem>;
  setItem: React.Dispatch<React.SetStateAction<Partial<CatalogueItem>>>;
}) {
  const fields = item.ingredient_fields ?? [];

  const addField = () => {
    setItem(prev => ({
      ...prev,
      ingredient_fields: [...(prev.ingredient_fields ?? []), createEmptyIngredient()],
    }));
  };

  const removeField = (idx: number) => {
    setItem(prev => ({
      ...prev,
      ingredient_fields: (prev.ingredient_fields ?? []).filter((_, i) => i !== idx),
    }));
  };

  const updateIngredient = (idx: number, key: keyof IngredientField, value: string) => {
    setItem(prev => {
      const updated = [...(prev.ingredient_fields ?? [])];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, ingredient_fields: updated };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Ingredient Fields</h2>
        <button
          onClick={addField}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Field
        </button>
      </div>
      <p className="text-xs text-gray-500">Define the source fields (from L1/L2/L3 tables) that feed into this metric.</p>

      <div className="space-y-3">
        {fields.map((f, i) => (
          <div key={i} className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Layer</label>
                <select
                  value={f.layer}
                  onChange={e => updateIngredient(i, 'layer', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Table</label>
                <input
                  type="text"
                  value={f.table}
                  onChange={e => updateIngredient(i, 'table', e.target.value)}
                  placeholder="e.g. facility_master"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Field</label>
                <input
                  type="text"
                  value={f.field}
                  onChange={e => updateIngredient(i, 'field', e.target.value)}
                  placeholder="e.g. committed_amt"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Description</label>
                <input
                  type="text"
                  value={f.description}
                  onChange={e => updateIngredient(i, 'description', e.target.value)}
                  placeholder="What this field represents"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => removeField(i)}
                  className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {fields.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-sm">
            No ingredient fields yet. Click &quot;Add Field&quot; to define source data.
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * STEP 3: LEVEL DEFINITIONS
 * ════════════════════════════════════════════════════════════════════════════ */

function LevelsStep({
  item,
  setItem,
}: {
  item: Partial<CatalogueItem>;
  setItem: React.Dispatch<React.SetStateAction<Partial<CatalogueItem>>>;
}) {
  const levels = item.level_definitions ?? [];

  const updateLevel = (idx: number, key: keyof LevelDefinition, value: unknown) => {
    setItem(prev => {
      const updated = [...(prev.level_definitions ?? [])];
      updated[idx] = { ...updated[idx], [key]: value };
      return { ...prev, level_definitions: updated };
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Level Definitions</h2>
      <p className="text-xs text-gray-500">
        Define how this metric is computed/available at each rollup level.
      </p>

      <div className="space-y-4">
        {levels.map((level, i) => (
          <div key={level.level} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-white">{ROLLUP_LEVEL_LABELS[level.level as RollupLevelKey]}</span>
              <span className="text-[10px] text-gray-500">({level.level})</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <FormField label="Dashboard Display Name">
                <input
                  type="text"
                  value={level.dashboard_display_name}
                  onChange={e => updateLevel(i, 'dashboard_display_name', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </FormField>
              <FormField label="Sourcing Type">
                <select
                  value={level.sourcing_type}
                  onChange={e => updateLevel(i, 'sourcing_type', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="Raw">Raw (directly sourced)</option>
                  <option value="Calc">Calc (computed)</option>
                  <option value="Agg">Agg (aggregated)</option>
                  <option value="Avg">Avg (weighted average)</option>
                </select>
              </FormField>
            </div>

            <FormField label="Level Logic">
              <textarea
                value={level.level_logic}
                onChange={e => updateLevel(i, 'level_logic', e.target.value)}
                rows={3}
                placeholder="Describe how the metric is computed at this level. Use pipe-delimited format for step-by-step: Step 1 | Step 2 | Step 3"
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none resize-none"
              />
            </FormField>

            <div className="flex items-center gap-2 mt-2">
              <label className="flex items-center gap-2 text-xs text-gray-400">
                <input
                  type="checkbox"
                  checked={level.in_record}
                  onChange={e => updateLevel(i, 'in_record', e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
                />
                In record (available in data model)
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * STEP 4: VISUALIZATION CONFIG PREVIEW
 * ════════════════════════════════════════════════════════════════════════════ */

function VisualizationStep({
  item,
  config,
}: {
  item: Partial<CatalogueItem>;
  config: ReturnType<typeof buildVisualizationConfig>;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-white">Auto-Generated Visualization Config</h2>
      <p className="text-xs text-gray-500">
        These settings are auto-inferred from your metric definition. They drive all visualizations.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Rollup Strategy" value={config.rollup_strategy} />
        <InfoCard label="Value Format" value={`${config.value_format.format} (${config.value_format.decimals} decimals)`} />
        <InfoCard label="Direction" value={config.value_format.direction.replace('_', ' ')} />
        <InfoCard label="Result Format" value={config.formula_decomposition.result_format} />
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="text-sm font-bold text-white mb-3">Color Bands</h3>
        <div className="space-y-1.5">
          {config.value_format.color_bands.map((band, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full bg-${band.color.replace('text-', '')}`} />
              <span className={`text-xs font-mono text-${band.color}`}>≥ {band.threshold}</span>
              {band.label && <span className="text-[10px] text-gray-500">{band.label}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        <h3 className="text-sm font-bold text-white mb-3">Worked Example Columns</h3>
        <div className="flex gap-2 flex-wrap">
          {config.worked_example_columns.map(col => (
            <span
              key={col.field}
              className={`px-2 py-1 rounded text-xs font-mono ${
                col.is_result ? 'bg-emerald-500/15 text-emerald-400 font-bold' : 'bg-gray-800 text-gray-300'
              }`}
            >
              {col.header} ({col.format})
              {col.is_result && ' ★'}
            </span>
          ))}
        </div>
      </div>

      {config.formula_decomposition.numerator.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <h3 className="text-sm font-bold text-white mb-3">Formula Decomposition</h3>
          <div className="space-y-2">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Numerator</span>
              {config.formula_decomposition.numerator.map((c, i) => (
                <div key={i} className="text-xs text-gray-300 ml-3">
                  {c.op} {c.label} <span className="text-gray-600">({c.source_table}.{c.field})</span>
                </div>
              ))}
            </div>
            {config.formula_decomposition.denominator.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Denominator</span>
                {config.formula_decomposition.denominator.map((c, i) => (
                  <div key={i} className="text-xs text-gray-300 ml-3">
                    {c.op} {c.label} <span className="text-gray-600">({c.source_table}.{c.field})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * STEP 5: LIVE PREVIEW
 * ════════════════════════════════════════════════════════════════════════════ */

function PreviewStep({ item }: { item: CatalogueItem }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Live Preview</h2>
      <p className="text-xs text-gray-500 mb-4">
        This is how your metric&apos;s lineage page will look. All visualizations are auto-generated from your definition.
      </p>
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <DynamicMetricLineage item={item} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * SHARED UI COMPONENTS
 * ════════════════════════════════════════════════════════════════════════════ */

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">{label}</span>
      <span className="text-sm font-mono text-white">{value}</span>
    </div>
  );
}
