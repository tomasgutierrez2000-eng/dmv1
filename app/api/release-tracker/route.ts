import { NextRequest, NextResponse } from 'next/server';
import { RELEASE_ENTRIES, type ReleaseEntry } from '@/lib/release-tracker-data';

/** GET: export release tracker as Excel (.xlsx). */
export async function GET() {
  const XLSX = await import('xlsx');

  const rows: unknown[][] = RELEASE_ENTRIES.map((e) => [
    e.date,
    e.layer,
    e.table,
    e.field,
    e.changeType,
    e.rationale,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([
    ['Date', 'Layer', 'Table', 'Field', 'Change Type', 'Rationale'],
    ...rows,
  ]);

  // Column widths
  ws['!cols'] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 34 },
    { wch: 34 },
    { wch: 14 },
    { wch: 70 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Release Tracker');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="release-tracker-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}

const VALID_LAYERS = new Set(['L1', 'L2', 'L3', 'Metric Library']);
const VALID_CHANGE_TYPES = new Set(['Added', 'Removed', 'Moved']);

/** POST: import release tracker entries from uploaded Excel. */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = wb.SheetNames.find(
      (n) => n.toLowerCase().replace(/\s+/g, '') === 'releasetracker'
    ) ?? wb.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json({ error: 'No sheets found in workbook' }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[sheetName]);

    const imported: ReleaseEntry[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed, skip header

      // Normalize header keys (case-insensitive, strip spaces)
      const norm: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        norm[k.toLowerCase().replace(/[\s_]+/g, '')] = String(v ?? '').trim();
      }

      const date = norm['date'] ?? '';
      const layer = norm['layer'] ?? '';
      const table = norm['table'] ?? '';
      const field = norm['field'] ?? '';
      const changeType = norm['changetype'] ?? '';
      const rationale = norm['rationale'] ?? '';

      if (!date || !layer || !table || !field || !changeType) {
        errors.push(`Row ${rowNum}: missing required field (date, layer, table, field, or changeType)`);
        continue;
      }

      if (!VALID_LAYERS.has(layer)) {
        errors.push(`Row ${rowNum}: invalid layer "${layer}" — must be L1, L2, L3, or Metric Library`);
        continue;
      }

      if (!VALID_CHANGE_TYPES.has(changeType)) {
        errors.push(`Row ${rowNum}: invalid changeType "${changeType}" — must be Added, Removed, or Moved`);
        continue;
      }

      imported.push({
        date,
        layer: layer as ReleaseEntry['layer'],
        table,
        field,
        changeType: changeType as ReleaseEntry['changeType'],
        rationale,
      });
    }

    return NextResponse.json({
      imported: imported.length,
      errors,
      entries: imported,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse file' },
      { status: 500 },
    );
  }
}
