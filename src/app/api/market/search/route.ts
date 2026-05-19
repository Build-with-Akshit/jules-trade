import YahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

const yahooFinance = new (YahooFinance as any)();

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

  try {
    const results = await yahooFinance.search(query);
    let quotes = (results.quotes || []).slice(0, 5); // take top 5

    // Fetch full quotes to get the live marketState for the search dropdown
    if (quotes.length > 0) {
      const fullQuotes = await Promise.all(
        quotes.map((q: any) => yahooFinance.quote(q.symbol).catch(() => null))
      );
      quotes = quotes.map((q: any, i: number) => {
        if (fullQuotes[i]) {
          q.marketState = fullQuotes[i].marketState;
        }
        return q;
      });
    }

    return NextResponse.json(quotes);
  } catch (error) {
    console.warn('Market search error from Yahoo Finance, falling back to static list:', error);
    const matchedFallbacks = fallbacks.filter(f =>
      f.symbol.toLowerCase().includes(query.toLowerCase()) ||
      f.shortname.toLowerCase().includes(query.toLowerCase())
    );
    // Return the stable fallbacks
    return NextResponse.json(matchedFallbacks);
  }
}
