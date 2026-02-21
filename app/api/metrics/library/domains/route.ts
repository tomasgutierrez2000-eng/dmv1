import { NextResponse } from 'next/server';
import { getDomains } from '@/lib/metric-library/store';

export async function GET() {
  const domains = getDomains();
  return NextResponse.json(domains);
}
