import { NextResponse } from 'next/server';
import db from '@/lib/db';
import YahooFinance from 'yahoo-finance2';
import { YahooQuote } from '@/lib/types';

const yahooFinance = new (YahooFinance as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const userResult = await db.execute({
      sql: 'SELECT balance FROM users WHERE id = ?',
      args: [userId]
    });
    const user = userResult.rows[0] as unknown as { balance: number } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const portfolioResult = await db.execute({
      sql: 'SELECT symbol, shares, average_price FROM portfolio WHERE user_id = ?',
      args: [userId]
    });
    const holdings = portfolioResult.rows as unknown as Array<{symbol: string, shares: number, average_price: number}>;

    // Enhance holdings with current market data — fetch each symbol individually
    // so one invalid symbol doesn't break real-time pricing for all others
    let enhancedHoldings: any[] = [];
    if (holdings.length > 0) {
      enhancedHoldings = await Promise.all(
        holdings.map(async (holding) => {
          let currentPrice = holding.average_price; // fallback
          try {
            const quote = await yahooFinance.quote(holding.symbol);
            if (quote?.regularMarketPrice) {
              currentPrice = quote.regularMarketPrice;
            }
          } catch (err: any) {
            console.warn(`[Portfolio] Failed to fetch live price for ${holding.symbol}:`, err?.message || err);
          }

          const totalValue = currentPrice * holding.shares;
          const costBasis = holding.average_price * holding.shares;
          const returnVal = totalValue - costBasis;
          const returnPct = holding.average_price > 0
            ? ((currentPrice - holding.average_price) / holding.average_price) * 100
            : 0;

          return {
            ...holding,
            currentPrice,
            totalValue,
            return: returnVal,
            returnPct
          };
        })
      );
    }

    const transactionsResult = await db.execute({
      sql: 'SELECT symbol, type, shares, price, timestamp FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10',
      args: [userId]
    });
    const transactions = transactionsResult.rows;

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
