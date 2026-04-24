import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const results = await yahooFinance.search(query);
    // @ts-ignore
    return NextResponse.json(results.quotes || []);
  } catch (error) {
    console.error('Market search error:', error);
    return NextResponse.json({ error: 'Failed to search market' }, { status: 500 });
  }
}
