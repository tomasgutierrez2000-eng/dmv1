'use client';

import { X, FileCode } from 'lucide-react';
import type { ModelDiff } from '../../utils/modelDiff';

export default function SchemaImportModal({
  diff,
  onApply,
  onClose,
}: {
  diff: ModelDiff;
  onApply: () => void;
  onClose: () => void;
}) {
  const s = diff.summary;
  const hasChanges =
    s.tablesAdded > 0 ||
    s.tablesRemoved > 0 ||
    s.tablesModified > 0 ||
    s.fieldsAdded > 0 ||
    s.fieldsRemoved > 0 ||
    s.fieldsModified > 0 ||
    s.relationshipsAdded > 0 ||
    s.relationshipsRemoved > 0;

  const sqlActionCount =
    s.tablesAdded + s.tablesRemoved + s.tablesModified + s.relationshipsAdded + s.relationshipsRemoved;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-pwc-gray border border-pwc-gray-light rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col text-pwc-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-pwc-gray-light">
          <h2 className="text-lg font-semibold">Schema import – track changes for SQL &amp; visualization</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-pwc-gray-light text-pwc-gray-light hover:text-pwc-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* SQL changes summary – what has to be updated in SQL */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-pwc-black/60 border border-pwc-orange/40">
            <FileCode className="w-5 h-5 text-pwc-orange flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-pwc-orange mb-1">SQL changes to apply</h3>
              <p className="text-sm text-pwc-gray-light">
                {sqlActionCount === 0 && !hasChanges
                  ? 'No schema changes. Apply to refresh metadata only.'
                  : sqlActionCount === 0
                    ? 'Field-level changes only (data types, descriptions). Consider ALTER COLUMN where needed.'
                    : 'Update your database to match the imported schema. Summary below shows what to run in SQL and what will change in the visualization.'}
              </p>
              {sqlActionCount > 0 && (
                <ul className="mt-2 text-xs text-pwc-gray-light space-y-0.5">
                  {s.tablesAdded > 0 && <li>• CREATE TABLE: {s.tablesAdded} table(s)</li>}
                  {s.tablesRemoved > 0 && <li>• DROP TABLE: {s.tablesRemoved} table(s)</li>}
                  {s.tablesModified > 0 && <li>• ALTER TABLE: {s.tablesModified} table(s) (add/remove/change columns)</li>}
                  {s.relationshipsAdded > 0 && <li>• ADD FK constraints: {s.relationshipsAdded}</li>}
                  {s.relationshipsRemoved > 0 && <li>• DROP FK constraints: {s.relationshipsRemoved}</li>}
                </ul>
              )}
            </div>
          </div>

          {!hasChanges && (
            <p className="text-pwc-gray-light">No structural differences from current model. You can still apply to sync metadata.</p>
          )}
          {s.tablesAdded > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-pwc-orange mb-2">Tables to add (SQL: CREATE TABLE)</h3>
              <ul className="list-disc list-inside text-sm text-pwc-gray-light space-y-1">
                {diff.tablesAdded.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </section>
          )}
          {s.tablesRemoved > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-pwc-orange mb-2">Tables to remove (SQL: DROP TABLE)</h3>
              <ul className="list-disc list-inside text-sm text-pwc-gray-light space-y-1">
                {diff.tablesRemoved.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </section>
          )}
          {s.tablesModified > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-pwc-orange mb-2">Tables with field changes (SQL: ALTER TABLE)</h3>
              <ul className="list-disc list-inside text-sm text-pwc-gray-light space-y-1">
                {diff.tablesModified.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
              {(diff.fieldsAdded.length > 0 || diff.fieldsRemoved.length > 0 || diff.fieldsModified.length > 0) && (
                <div className="mt-2 text-xs text-pwc-gray-light">
                  Fields added: {diff.fieldsAdded.length} · removed: {diff.fieldsRemoved.length} · modified: {diff.fieldsModified.length}
                </div>
              )}
            </section>
          )}
          {s.relationshipsAdded > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-pwc-orange mb-2">Relationships to add (FK constraints)</h3>
              <ul className="list-disc list-inside text-sm text-pwc-gray-light space-y-1 max-h-32 overflow-y-auto">
                {diff.relationshipsAdded.slice(0, 20).map((id) => (
                  <li key={id}>{id}</li>
                ))}
                {diff.relationshipsAdded.length > 20 && (
                  <li>… and {diff.relationshipsAdded.length - 20} more</li>
                )}
              </ul>
            </section>
          )}
          {s.relationshipsRemoved > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-pwc-orange mb-2">Relationships to remove</h3>
              <ul className="list-disc list-inside text-sm text-pwc-gray-light space-y-1 max-h-32 overflow-y-auto">
                {diff.relationshipsRemoved.slice(0, 20).map((id) => (
                  <li key={id}>{id}</li>
                ))}
                {diff.relationshipsRemoved.length > 20 && (
                  <li>… and {diff.relationshipsRemoved.length - 20} more</li>
                )}
              </ul>
            </section>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-pwc-gray-light">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-pwc-gray-light text-pwc-gray-light hover:bg-pwc-gray-light hover:text-pwc-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="px-4 py-2 rounded-lg bg-pwc-orange hover:bg-pwc-orange-light text-pwc-white"
          >
            Apply imported model
          </button>
        </div>
      </div>
    </div>
  );
}
