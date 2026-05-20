import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { getSimulatedOptionQuoteFromUnderlying } from '@/lib/options';

const yahooFinance = new (YahooFinance as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // If it's a simulated option contract
    if (symbol.includes('-OPT-')) {
      const parts = symbol.split('-OPT-');
      const underlyingSymbol = parts[0];
      const underlyingQuote = await yahooFinance.quote(underlyingSymbol);
      const underlyingPrice = underlyingQuote.regularMarketPrice;
      const underlyingPrevClose = underlyingQuote.regularMarketPreviousClose || underlyingPrice;
      const underlyingMarketState = underlyingQuote.marketState || 'REGULAR';
      
      if (!underlyingPrice) {
        return NextResponse.json({ error: 'Failed to get underlying price' }, { status: 400 });
      }
      
      const optionQuote = getSimulatedOptionQuoteFromUnderlying(symbol, underlyingPrice, underlyingPrevClose, underlyingMarketState);
      if (!optionQuote) {
        return NextResponse.json({ error: 'Failed to parse option symbol' }, { status: 400 });
      }
      return NextResponse.json(optionQuote);
    }

    const quote = await yahooFinance.quote(symbol);
    return NextResponse.json(quote);
  } catch (error) {
    console.error('Market quote error:', error);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
