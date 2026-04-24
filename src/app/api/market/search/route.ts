import { NextResponse } from 'next/server';

// Fallback search since Yahoo search has flaky API limits,
// using generic predefined assets to ensure smooth paper trading experience
const fallbacks = [
    { symbol: 'AAPL', shortname: 'Apple Inc.', quoteType: 'EQUITY' },
    { symbol: 'BTC-USD', shortname: 'Bitcoin USD', quoteType: 'CRYPTOCURRENCY' },
    { symbol: 'MSFT', shortname: 'Microsoft Corp.', quoteType: 'EQUITY' },
    { symbol: 'GOOGL', shortname: 'Alphabet Inc.', quoteType: 'EQUITY' },
    { symbol: 'TSLA', shortname: 'Tesla Inc.', quoteType: 'EQUITY' },
    { symbol: 'AMZN', shortname: 'Amazon.com Inc.', quoteType: 'EQUITY' }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const matchedFallbacks = fallbacks.filter(f =>
    f.symbol.toLowerCase().includes(query.toLowerCase()) ||
    f.shortname.toLowerCase().includes(query.toLowerCase())
  );

  // Return the stable fallbacks
  return NextResponse.json(matchedFallbacks);
}
