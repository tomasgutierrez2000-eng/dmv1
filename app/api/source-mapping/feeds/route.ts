import { NextRequest, NextResponse } from 'next/server';
import { getSourceFeeds, saveSourceFeed } from '@/lib/source-mapping/store';
import type { SourceFeed } from '@/lib/source-mapping/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source_system_id = searchParams.get('source_system_id');
  const list = getSourceFeeds(source_system_id ?? undefined);
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  let body: SourceFeed;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.feed_id || !body.source_system_id || !body.feed_name) {
    return NextResponse.json({ error: 'feed_id, source_system_id, feed_name required' }, { status: 400 });
  }
  saveSourceFeed(body);
  return NextResponse.json(getSourceFeeds().find((f) => f.feed_id === body.feed_id)!);
}
