import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

const exploreCache = {
  data: null as any,
  timestamp: 0
};
const CACHE_TTL = 1000 * 60; // 1 minute

export async function GET() {
  if (exploreCache.data && Date.now() - exploreCache.timestamp < CACHE_TTL) {
    return NextResponse.json(exploreCache.data);
  }

  try {
    // Run sequentially if parallel fails typechecks
    let gainers: any = { quotes: [] };
    let losers: any = { quotes: [] };
    let trending: any = { quotes: [] };
    let beginnerQuotes: any = [];

    try { gainers = await yahooFinance.dailyGainers(); } catch(e){}
    try { losers = await yahooFinance.dailyLosers(); } catch(e){}
    try { trending = await yahooFinance.trendingSymbols('US'); } catch(e){}

    const beginnerSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'SPY', 'QQQ'];
    try {
        beginnerQuotes = await yahooFinance.quote(beginnerSymbols);
    } catch(e){}

    const result = {
      gainers: gainers?.quotes?.slice(0, 5) || [],
      losers: losers?.quotes?.slice(0, 5) || [],
      trending: trending?.quotes?.slice(0, 5) || [],
      beginner: beginnerQuotes
    };

    exploreCache.data = result;
    exploreCache.timestamp = Date.now();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Explore API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch explore data' }, { status: 500 });
  }
}
