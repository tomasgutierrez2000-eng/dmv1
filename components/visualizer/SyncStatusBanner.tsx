'use client';

import { useState } from 'react';
import { useModelStore } from '../../store/modelStore';
import { CheckCircle2, AlertTriangle, WifiOff, X } from 'lucide-react';
import Link from 'next/link';

export default function SyncStatusBanner() {
  const { dbStatusSummary, dbStatusConnected, dbStatusMap } = useModelStore();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if dismissed, no status loaded yet, or no model
  if (dismissed || !dbStatusSummary) return null;

  const hasLoaded = Object.keys(dbStatusMap).length > 0;
  if (!hasLoaded) return null;

  const { tablesWithData, tablesEmpty, tablesNotInDb, tablesNotInDd, tablesWithFieldDrift, totalFieldDrifts } = dbStatusSummary;
  const totalSynced = tablesWithData + tablesEmpty;
  const hasDrift = tablesNotInDb > 0 || tablesNotInDd > 0 || tablesWithFieldDrift > 0;

  // Determine banner style
  let bgClass: string;
  let Icon: typeof CheckCircle2;
  let message: string;

  if (!dbStatusConnected) {
    bgClass = 'bg-gray-100 border-gray-200 text-gray-600';
    Icon = WifiOff;
    message = 'Database not connected';
  } else if (hasDrift) {
    bgClass = 'bg-amber-50 border-amber-200 text-amber-800';
    Icon = AlertTriangle;
    const parts: string[] = [];
    if (tablesNotInDb > 0) parts.push(`${tablesNotInDb} not in DB`);
    if (tablesNotInDd > 0) parts.push(`${tablesNotInDd} orphan`);
    if (tablesWithFieldDrift > 0) parts.push(`${tablesWithFieldDrift} with field drift (${totalFieldDrifts} fields)`);
    message = `${totalSynced} tables synced \u00b7 ${parts.join(', ')}`;
  } else {
    bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
    Icon = CheckCircle2;
    message = `${totalSynced} tables synced with database`;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b ${bgClass}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <Link href="/db-status" className="flex-1 hover:underline cursor-pointer">
        {message}
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-black/5 flex-shrink-0"
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
