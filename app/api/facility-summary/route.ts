import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'facility-summary-mvp', 'output', 'l3', 'facility-summary.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading facility summary:', error);
    return NextResponse.json(
      { error: 'Failed to load facility summary data' },
      { status: 500 }
    );
  }
}
