import { NextResponse } from 'next/server';
import db from '@/lib/db';
import yahooFinance from 'yahoo-finance2';
import { YahooQuote } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const userStmt = db.prepare('SELECT balance FROM users WHERE id = ?');
    const user = userStmt.get(userId) as { balance: number } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const portfolioStmt = db.prepare('SELECT symbol, shares, average_price FROM portfolio WHERE user_id = ?');
    const holdings = portfolioStmt.all(userId) as Array<{symbol: string, shares: number, average_price: number}>;

    // Enhance holdings with current market data in a single batch call to prevent rate limiting
    let enhancedHoldings: any[] = [];
    if (holdings.length > 0) {
      const symbols = holdings.map(h => h.symbol);
      try {
        const quotes = await yahooFinance.quote(symbols);
        const quotesArray: any[] = Array.isArray(quotes) ? quotes : [quotes];
//         const quote = await yahooFinance.quote(holding.symbol) as YahooQuote;
        const currentPrice = quote.regularMarketPrice || holding.average_price;
        const totalValue = currentPrice * holding.shares;
        const returnVal = totalValue - (holding.average_price * holding.shares);
        const returnPct = (currentPrice - holding.average_price) / holding.average_price * 100;

        enhancedHoldings = holdings.map((holding) => {
           const quote = quotesArray.find((q: any) => q.symbol === holding.symbol);
           const currentPrice = quote?.regularMarketPrice || holding.average_price;
           const totalValue = currentPrice * holding.shares;
           const returnVal = totalValue - (holding.average_price * holding.shares);
           const returnPct = (currentPrice - holding.average_price) / holding.average_price * 100;

           return {
             ...holding,
             currentPrice,
             totalValue,
             return: returnVal,
             returnPct
           };
        });
      } catch (err) {
         // Fallback if batch fetch fails
         enhancedHoldings = holdings.map(holding => ({
            ...holding,
            currentPrice: holding.average_price,
            totalValue: holding.average_price * holding.shares,
            return: 0,
            returnPct: 0
         }));
      }
    }

    const transactionsStmt = db.prepare('SELECT symbol, type, shares, price, timestamp FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10');
    const transactions = transactionsStmt.all(userId);

    const portfolioValue = enhancedHoldings.reduce((sum, h) => sum + h.totalValue, 0);

    return NextResponse.json({
      balance: user.balance,
      portfolioValue,
      totalValue: user.balance + portfolioValue,
      holdings: enhancedHoldings,
      transactions
    });

  } catch (error: any) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
