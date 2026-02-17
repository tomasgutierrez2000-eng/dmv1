import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const L3_SQL_DIR = path.join(process.cwd(), 'sql', 'l3');
const ALLOWED_FILES = [
  '00_README.md',
  '01_DDL_all_tables.sql',
  '02_POPULATION_tier1.sql',
  '03_POPULATION_tier2.sql',
  '04_POPULATION_tier3.sql',
  '05_POPULATION_tier4.sql',
  '06_ORCHESTRATOR.sql',
  '07_RECONCILIATION.sql',
  '08_INDEXES.sql',
  '09_GLOBAL_CONVENTIONS.md',
];

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get('file');
  if (!file) {
    return NextResponse.json({ error: 'Missing file query parameter' }, { status: 400 });
  }
  if (!ALLOWED_FILES.includes(file)) {
    return NextResponse.json({ error: 'File not allowed' }, { status: 403 });
  }
  const filePath = path.join(L3_SQL_DIR, file);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const contentType = file.endsWith('.md') ? 'text/markdown' : 'text/plain';
  return new NextResponse(content, {
    headers: { 'Content-Type': contentType },
  });
}
