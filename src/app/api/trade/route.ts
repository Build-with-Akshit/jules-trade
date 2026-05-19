import { NextResponse } from 'next/server';
import db from '@/lib/db';
import YahooFinance from 'yahoo-finance2';
import { YahooQuote } from '@/lib/types';

const yahooFinance = new (YahooFinance as any)();

export async function POST(request: Request) {
  try {
    const { userId, symbol, type, shares } = await request.json();

    if (!userId || !symbol || !type || !shares || shares <= 0 || !Number.isInteger(shares)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Get current market price
    const quote = await yahooFinance.quote(symbol) as any;
    const currentPrice = quote.regularMarketPrice;

    if (!currentPrice) {
      return NextResponse.json({ error: 'Failed to get current price' }, { status: 400 });
    }

    // Check if the market is open for trading
    if (quote.marketState !== 'REGULAR') {
      return NextResponse.json({ 
        error: `Market is currently ${quote.marketState || 'CLOSED'}. You can only trade during regular market hours.` 
      }, { status: 400 });
    }

    const totalValue = currentPrice * shares;

    // Begin transaction
    const tx = await db.transaction("write");
    try {
      // Get user
      const userResult = await tx.execute({
        sql: 'SELECT balance FROM users WHERE id = ?',
        args: [userId]
      });
      const user = userResult.rows[0] as unknown as { balance: number } | undefined;

      if (!user) throw new Error('User not found');

      if (type === 'BUY') {
        if (user.balance < totalValue) throw new Error('Insufficient funds');

        // Update balance
        await tx.execute({
          sql: 'UPDATE users SET balance = balance - ? WHERE id = ?',
          args: [totalValue, userId]
        });

        // Update portfolio
        const portfolioResult = await tx.execute({
          sql: 'SELECT shares, average_price FROM portfolio WHERE user_id = ? AND symbol = ?',
          args: [userId, symbol]
        });
        const holding = portfolioResult.rows[0] as unknown as { shares: number, average_price: number } | undefined;

        if (holding) {
          const newShares = holding.shares + shares;
          const newAvg = ((holding.shares * holding.average_price) + totalValue) / newShares;
          await tx.execute({
            sql: 'UPDATE portfolio SET shares = ?, average_price = ? WHERE user_id = ? AND symbol = ?',
            args: [newShares, newAvg, userId, symbol]
          });
        } else {
          await tx.execute({
            sql: 'INSERT INTO portfolio (user_id, symbol, shares, average_price) VALUES (?, ?, ?, ?)',
            args: [userId, symbol, shares, currentPrice]
          });
        }

      } else if (type === 'SELL') {
        const portfolioResult = await tx.execute({
          sql: 'SELECT shares FROM portfolio WHERE user_id = ? AND symbol = ?',
          args: [userId, symbol]
        });
        const holding = portfolioResult.rows[0] as unknown as { shares: number } | undefined;

        if (!holding || holding.shares < shares) throw new Error('Insufficient shares');

        // Update balance
        await tx.execute({
          sql: 'UPDATE users SET balance = balance + ? WHERE id = ?',
          args: [totalValue, userId]
        });

        // Update portfolio
        if (holding.shares === shares) {
          await tx.execute({
            sql: 'DELETE FROM portfolio WHERE user_id = ? AND symbol = ?',
            args: [userId, symbol]
          });
        } else {
          await tx.execute({
            sql: 'UPDATE portfolio SET shares = shares - ? WHERE user_id = ? AND symbol = ?',
            args: [shares, userId, symbol]
          });
        }
      } else {
        throw new Error('Invalid trade type');
      }

      // Record transaction
      await tx.execute({
        sql: 'INSERT INTO transactions (user_id, symbol, type, shares, price) VALUES (?, ?, ?, ?, ?)',
        args: [userId, symbol, type, shares, currentPrice]
      });

      await tx.commit();
      return NextResponse.json({ success: true, currentPrice, totalValue });

    } catch (error: any) {
      await tx.rollback();
      console.error('Trade transaction error:', error);
      return NextResponse.json({ error: error.message || 'Failed to execute trade' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Trade error:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute trade' }, { status: 400 });
  }
}
