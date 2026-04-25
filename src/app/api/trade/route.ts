import { NextResponse } from 'next/server';
import db from '@/lib/db';
import yahooFinance from 'yahoo-finance2';
import { YahooQuote } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { userId, symbol, type, shares } = await request.json();

    if (!userId || !symbol || !type || !shares || shares <= 0 || !Number.isInteger(shares)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Get current market price
    const quote = await yahooFinance.quote(symbol) as YahooQuote;
    const currentPrice = quote.regularMarketPrice;

    if (!currentPrice) {
      return NextResponse.json({ error: 'Failed to get current price' }, { status: 400 });
    }

    const totalValue = currentPrice * shares;

    // Begin transaction
    const transaction = db.transaction(() => {
      // Get user
      const userStmt = db.prepare('SELECT balance FROM users WHERE id = ?');
      const user = userStmt.get(userId) as { balance: number } | undefined;

      if (!user) throw new Error('User not found');

      if (type === 'BUY') {
        if (user.balance < totalValue) throw new Error('Insufficient funds');

        // Update balance
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(totalValue, userId);

        // Update portfolio
        const portfolioStmt = db.prepare('SELECT shares, average_price FROM portfolio WHERE user_id = ? AND symbol = ?');
        const holding = portfolioStmt.get(userId, symbol) as { shares: number, average_price: number } | undefined;

        if (holding) {
          const newShares = holding.shares + shares;
          const newAvg = ((holding.shares * holding.average_price) + totalValue) / newShares;
          db.prepare('UPDATE portfolio SET shares = ?, average_price = ? WHERE user_id = ? AND symbol = ?')
            .run(newShares, newAvg, userId, symbol);
        } else {
          db.prepare('INSERT INTO portfolio (user_id, symbol, shares, average_price) VALUES (?, ?, ?, ?)')
            .run(userId, symbol, shares, currentPrice);
        }

      } else if (type === 'SELL') {
        const portfolioStmt = db.prepare('SELECT shares FROM portfolio WHERE user_id = ? AND symbol = ?');
        const holding = portfolioStmt.get(userId, symbol) as { shares: number } | undefined;

        if (!holding || holding.shares < shares) throw new Error('Insufficient shares');

        // Update balance
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalValue, userId);

        // Update portfolio
        if (holding.shares === shares) {
          db.prepare('DELETE FROM portfolio WHERE user_id = ? AND symbol = ?').run(userId, symbol);
        } else {
          db.prepare('UPDATE portfolio SET shares = shares - ? WHERE user_id = ? AND symbol = ?')
            .run(shares, userId, symbol);
        }
      } else {
        throw new Error('Invalid trade type');
      }

      // Record transaction
      db.prepare('INSERT INTO transactions (user_id, symbol, type, shares, price) VALUES (?, ?, ?, ?, ?)')
        .run(userId, symbol, type, shares, currentPrice);

      return { success: true, currentPrice, totalValue };
    });

    const result = transaction();
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Trade error:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute trade' }, { status: 400 });
  }
}
