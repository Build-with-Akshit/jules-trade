import { NextResponse } from 'next/server';
import db from '@/lib/db';
import YahooFinance from 'yahoo-finance2';
import { getExchangeRate, getAssetCurrency, convertAmount, getSimulatedOptionQuoteFromUnderlying } from '@/lib/options';

const yahooFinance = new (YahooFinance as any)();

// Consolidated helper for executing a single trade inside a transaction
export async function executeTradeOperation(
  tx: any,
  userId: number,
  symbol: string,
  type: 'BUY' | 'SELL',
  shares: number,
  currentPrice: number,
  userCurrency: 'USD' | 'INR',
  rate: number
) {
  const assetCurrency = getAssetCurrency(symbol);
  const totalValueNative = currentPrice * shares;
  const totalValueUser = convertAmount(totalValueNative, assetCurrency, userCurrency, rate);

  // Get user details
  const userResult = await tx.execute({
    sql: 'SELECT balance FROM users WHERE id = ?',
    args: [userId]
  });
  const user = userResult.rows[0] as unknown as { balance: number } | undefined;
  if (!user) throw new Error('User not found');

  if (type === 'BUY') {
    if (user.balance < totalValueUser) throw new Error('Insufficient funds');

    // Update balance
    await tx.execute({
      sql: 'UPDATE users SET balance = balance - ? WHERE id = ?',
      args: [totalValueUser, userId]
    });

    // Update portfolio (keep average price in asset's native currency)
    const portfolioResult = await tx.execute({
      sql: 'SELECT shares, average_price FROM portfolio WHERE user_id = ? AND symbol = ?',
      args: [userId, symbol]
    });
    const holding = portfolioResult.rows[0] as unknown as { shares: number, average_price: number } | undefined;

    if (holding) {
      const newShares = holding.shares + shares;
      const newAvg = ((holding.shares * holding.average_price) + totalValueNative) / newShares;
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
      args: [totalValueUser, userId]
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
  }

  // Record transaction
  await tx.execute({
    sql: 'INSERT INTO transactions (user_id, symbol, type, shares, price) VALUES (?, ?, ?, ?, ?)',
    args: [userId, symbol, type, shares, currentPrice]
  });

  return { totalValueUser, totalValueNative };
}

// Background matching engine for Limit and Stop Loss orders
export async function processPendingOrders(userId: number) {
  try {
    const pendingResult = await db.execute({
      sql: "SELECT id, user_id, symbol, type, order_type, shares, price FROM pending_orders WHERE user_id = ? AND status = 'PENDING'",
      args: [userId]
    });
    const pendingOrders = pendingResult.rows as unknown as Array<{
      id: number;
      user_id: number;
      symbol: string;
      type: 'BUY' | 'SELL';
      order_type: 'LIMIT' | 'STOP_LOSS';
      shares: number;
      price: number;
    }>;

    if (pendingOrders.length === 0) return;

    const rate = await getExchangeRate();

    for (const order of pendingOrders) {
      try {
        let currentPrice = 0;
        
        if (order.symbol.includes('-OPT-')) {
          const parts = order.symbol.split('-OPT-');
          const underlyingSymbol = parts[0];
          const underlyingQuote = await yahooFinance.quote(underlyingSymbol);
          const underlyingPrice = underlyingQuote.regularMarketPrice;
          const underlyingPrevClose = underlyingQuote.regularMarketPreviousClose || underlyingPrice;
          if (underlyingPrice) {
            const optQuote = getSimulatedOptionQuoteFromUnderlying(order.symbol, underlyingPrice, underlyingPrevClose, underlyingQuote.marketState || 'REGULAR');
            currentPrice = optQuote?.regularMarketPrice || 0;
          }
        } else {
          const quote = await yahooFinance.quote(order.symbol);
          currentPrice = quote.regularMarketPrice || 0;
        }

        if (currentPrice <= 0) continue;

        let isTriggered = false;
        if (order.order_type === 'LIMIT') {
          if (order.type === 'BUY' && currentPrice <= order.price) isTriggered = true;
          if (order.type === 'SELL' && currentPrice >= order.price) isTriggered = true;
        } else if (order.order_type === 'STOP_LOSS') {
          if (order.type === 'BUY' && currentPrice >= order.price) isTriggered = true;
          if (order.type === 'SELL' && currentPrice <= order.price) isTriggered = true;
        }

        if (isTriggered) {
          const tx = await db.transaction('write');
          try {
            const userRes = await tx.execute({
              sql: 'SELECT currency FROM users WHERE id = ?',
              args: [order.user_id]
            });
            const user = userRes.rows[0] as unknown as { currency: string } | undefined;
            const userCurrency = user?.currency || 'USD';

            await executeTradeOperation(
              tx,
              order.user_id,
              order.symbol,
              order.type,
              order.shares,
              currentPrice,
              userCurrency as 'USD' | 'INR',
              rate
            );

            await tx.execute({
              sql: "UPDATE pending_orders SET status = 'EXECUTED' WHERE id = ?",
              args: [order.id]
            });

            await tx.commit();
          } catch (txErr) {
            await tx.rollback();
            console.error(`[Matching Engine] Order ID ${order.id} failed transaction:`, txErr);
          }
        }
      } catch (orderErr) {
        console.error(`[Matching Engine] Error checking order ${order.id}:`, orderErr);
      }
    }
  } catch (err) {
    console.error('[Matching Engine] Error running pending orders check:', err);
  }
}

// POST: Place order (Market, Limit, or Stop Loss)
export async function POST(request: Request) {
  try {
    const { userId, symbol, type, shares, orderType = 'MARKET', price } = await request.json();

    if (!userId || !symbol || !type || !shares || shares <= 0 || !Number.isInteger(shares)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Share limit validation for SELL orders (Market & Pending)
    if (type === 'SELL') {
      const portfolioResult = await db.execute({
        sql: 'SELECT shares FROM portfolio WHERE user_id = ? AND symbol = ?',
        args: [userId, symbol]
      });
      const holding = portfolioResult.rows[0] as unknown as { shares: number } | undefined;
      const ownedShares = holding ? holding.shares : 0;

      if (ownedShares <= 0) {
        return NextResponse.json({ error: 'You do not own any shares of this asset to sell.' }, { status: 400 });
      }

      // Check shares already locked in pending SELL orders
      const pendingResult = await db.execute({
        sql: "SELECT SUM(shares) as total FROM pending_orders WHERE user_id = ? AND symbol = ? AND type = 'SELL' AND status = 'PENDING'",
        args: [userId, symbol]
      });
      const pendingRow = pendingResult.rows[0] as unknown as { total: number | null } | undefined;
      const pendingSellShares = pendingRow?.total || 0;

      if (shares + pendingSellShares > ownedShares) {
        const availableShares = ownedShares - pendingSellShares;
        return NextResponse.json({
          error: `Insufficient available shares. You own ${ownedShares} share(s) but already have ${pendingSellShares} share(s) locked in pending sell orders. Available to sell: ${availableShares}`
        }, { status: 400 });
      }
    }

    // Determine current market price
    let currentPrice = 0;
    let marketState = 'REGULAR';
    
    try {
      if (symbol.includes('-OPT-')) {
        const parts = symbol.split('-OPT-');
        const underlyingSymbol = parts[0];
        const underlyingQuote = await yahooFinance.quote(underlyingSymbol);
        const liveUnderlying = Array.isArray(underlyingQuote) ? underlyingQuote[0] : underlyingQuote;
        const underlyingPrice = liveUnderlying?.regularMarketPrice;
        const underlyingPrevClose = liveUnderlying?.regularMarketPreviousClose || underlyingPrice;
        marketState = liveUnderlying?.marketState || 'REGULAR';
        
        if (underlyingPrice) {
          const optQuote = getSimulatedOptionQuoteFromUnderlying(symbol, underlyingPrice, underlyingPrevClose, marketState);
          currentPrice = optQuote?.regularMarketPrice || 0;
        }
      } else {
        const quote = await yahooFinance.quote(symbol);
        const liveQ = Array.isArray(quote) ? quote[0] : quote;
        currentPrice = liveQ?.regularMarketPrice || 0;
        marketState = liveQ?.marketState;
      }
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to fetch price quote: ${err.message}` }, { status: 400 });
    }

    if (!currentPrice) {
      return NextResponse.json({ error: 'Failed to obtain current price' }, { status: 400 });
    }

    // Block market orders if market is closed (only if marketState is explicitly provided and not REGULAR)
    if (orderType === 'MARKET' && marketState && marketState !== 'REGULAR') {
      return NextResponse.json({ 
        error: `Market is currently ${marketState || 'CLOSED'}. Market orders can only be executed during regular hours.` 
      }, { status: 400 });
    }

    const rate = await getExchangeRate();

    // Limit or Stop Loss orders go to the pending_orders table
    if (orderType === 'LIMIT' || orderType === 'STOP_LOSS') {
      if (!price || price <= 0) {
        return NextResponse.json({ error: 'Trigger/Limit price must be positive for pending orders' }, { status: 400 });
      }

      await db.execute({
        sql: 'INSERT INTO pending_orders (user_id, symbol, type, order_type, shares, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [userId, symbol, type, orderType, shares, price, 'PENDING']
      });

      // Instantly run the matching engine to see if the pending order triggers immediately
      await processPendingOrders(userId);

      return NextResponse.json({ success: true, pending: true, message: `${orderType} order placed successfully.` });
    }

    // Immediate MARKET order execution
    const tx = await db.transaction('write');
    try {
      const userRes = await tx.execute({
        sql: 'SELECT currency FROM users WHERE id = ?',
        args: [userId]
      });
      const user = userRes.rows[0] as unknown as { currency: string } | undefined;
      const userCurrency = user?.currency || 'USD';

      const { totalValueUser } = await executeTradeOperation(
        tx,
        userId,
        symbol,
        type,
        shares,
        currentPrice,
        userCurrency as 'USD' | 'INR',
        rate
      );

      await tx.commit();
      return NextResponse.json({ success: true, currentPrice, totalValue: totalValueUser });

    } catch (error: any) {
      await tx.rollback();
      console.error('Immediate trade error:', error);
      return NextResponse.json({ error: error.message || 'Failed to execute trade' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Trade endpoint error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process trade' }, { status: 500 });
  }
}

// DELETE: Cancel a pending order
export async function DELETE(request: Request) {
  try {
    const { orderId, userId } = await request.json();

    if (!orderId || !userId) {
      return NextResponse.json({ error: 'Order ID and User ID are required' }, { status: 400 });
    }

    await db.execute({
      sql: "UPDATE pending_orders SET status = 'CANCELLED' WHERE id = ? AND user_id = ? AND status = 'PENDING'",
      args: [orderId, userId]
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Order cancellation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel order' }, { status: 500 });
  }
}

// PUT: Modify a pending order (shares and target price)
export async function PUT(request: Request) {
  try {
    const { orderId, userId, shares, price } = await request.json();

    if (!orderId || !userId || !shares || !price) {
      return NextResponse.json({ error: 'Order ID, User ID, shares, and price are required' }, { status: 400 });
    }

    if (Number(shares) <= 0 || Number(price) <= 0) {
      return NextResponse.json({ error: 'Shares and price must be greater than zero' }, { status: 400 });
    }

    // Check if the order is still PENDING
    const checkOrder = await db.execute({
      sql: "SELECT symbol, type, status FROM pending_orders WHERE id = ? AND user_id = ?",
      args: [orderId, userId]
    });
    const order = checkOrder.rows[0] as any;
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: `Cannot modify order because it is already ${order.status.toLowerCase()}` }, { status: 400 });
    }

    // Share limit validation for modifying pending SELL orders
    if (order.type === 'SELL') {
      const symbol = order.symbol;
      const portfolioResult = await db.execute({
        sql: 'SELECT shares FROM portfolio WHERE user_id = ? AND symbol = ?',
        args: [userId, symbol]
      });
      const holding = portfolioResult.rows[0] as unknown as { shares: number } | undefined;
      const ownedShares = holding ? holding.shares : 0;

      // Sum shares locked in other pending orders (excluding the one being modified)
      const pendingResult = await db.execute({
        sql: "SELECT SUM(shares) as total FROM pending_orders WHERE user_id = ? AND symbol = ? AND type = 'SELL' AND status = 'PENDING' AND id != ?",
        args: [userId, symbol, orderId]
      });
      const pendingRow = pendingResult.rows[0] as unknown as { total: number | null } | undefined;
      const pendingSellShares = pendingRow?.total || 0;

      if (Number(shares) + pendingSellShares > ownedShares) {
        const availableShares = ownedShares - pendingSellShares;
        return NextResponse.json({
          error: `Insufficient available shares. You own ${ownedShares} share(s) but already have ${pendingSellShares} share(s) locked in other pending sell orders. Max modify limit: ${availableShares}`
        }, { status: 400 });
      }
    }

    await db.execute({
      sql: "UPDATE pending_orders SET shares = ?, price = ? WHERE id = ? AND user_id = ? AND status = 'PENDING'",
      args: [Number(shares), Number(price), orderId, userId]
    });

    // Run matching engine to check if modified order triggers immediately
    await processPendingOrders(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Order modification error:', error);
    return NextResponse.json({ error: error.message || 'Failed to modify order' }, { status: 500 });
  }
}
