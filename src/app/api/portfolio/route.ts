import { NextResponse } from 'next/server';
import db from '@/lib/db';
import YahooFinance from 'yahoo-finance2';
import { getExchangeRate, getAssetCurrency, convertAmount, getSimulatedOptionQuoteFromUnderlying } from '@/lib/options';
import { processPendingOrders } from '../trade/route';

const yahooFinance = new (YahooFinance as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const userIdNum = Number(userId);

  try {
    // 1. Run the matching engine to process any pending Limit/SL orders before fetching portfolio
    await processPendingOrders(userIdNum);

    // 2. Fetch user currency & balance details
    const userResult = await db.execute({
      sql: 'SELECT balance, currency FROM users WHERE id = ?',
      args: [userIdNum]
    });
    const user = userResult.rows[0] as unknown as { balance: number; currency: 'USD' | 'INR' } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userCurrency = user.currency || 'USD';
    const exchangeRate = await getExchangeRate();

    // 3. Fetch portfolio holdings
    const portfolioResult = await db.execute({
      sql: 'SELECT symbol, shares, average_price FROM portfolio WHERE user_id = ?',
      args: [userIdNum]
    });
    const holdings = portfolioResult.rows as unknown as Array<{ symbol: string; shares: number; average_price: number }>;

    // 4. Enhance holdings with live market prices and currency conversion
    let enhancedHoldings: any[] = [];
    if (holdings.length > 0) {
      enhancedHoldings = await Promise.all(
        holdings.map(async (holding) => {
          let currentPriceNative = holding.average_price; // Fallback
          const assetCurrency = getAssetCurrency(holding.symbol);

          try {
            // Check if simulated option contract
            if (holding.symbol.includes('-OPT-')) {
              const parts = holding.symbol.split('-OPT-');
              const underlyingSymbol = parts[0];
              const underlyingQuote = await yahooFinance.quote(underlyingSymbol);
              const underlyingPrice = underlyingQuote.regularMarketPrice;
              const underlyingPrevClose = underlyingQuote.regularMarketPreviousClose || underlyingPrice;
              
              if (underlyingPrice) {
                const optQuote = getSimulatedOptionQuoteFromUnderlying(holding.symbol, underlyingPrice, underlyingPrevClose);
                currentPriceNative = optQuote?.regularMarketPrice || currentPriceNative;
              }
            } else {
              const quote = await yahooFinance.quote(holding.symbol);
              const liveQ = Array.isArray(quote) ? quote[0] : quote;
              if (liveQ?.regularMarketPrice) {
                currentPriceNative = liveQ.regularMarketPrice;
              }
            }
          } catch (err: any) {
            console.warn(`[Portfolio API] Live price check failed for ${holding.symbol}:`, err?.message || err);
          }

          // Convert values to user preferred currency
          const avgPriceUser = convertAmount(holding.average_price, assetCurrency, userCurrency, exchangeRate);
          const currentPriceUser = convertAmount(currentPriceNative, assetCurrency, userCurrency, exchangeRate);
          
          const totalValueUser = currentPriceUser * holding.shares;
          const costBasisUser = avgPriceUser * holding.shares;
          const returnUser = totalValueUser - costBasisUser;
          const returnPctUser = costBasisUser > 0 ? (returnUser / costBasisUser) * 100 : 0;

          return {
            ...holding,
            average_price: avgPriceUser, // display average price in user's currency
            averagePriceNative: holding.average_price,
            currentPrice: currentPriceUser, // display current price in user's currency
            currentPriceNative,
            totalValue: totalValueUser,
            return: returnUser,
            returnPct: returnPctUser,
            currency: userCurrency,
            assetCurrency
          };
        })
      );
    }

    // 5. Fetch transactions (last 10)
    const transactionsResult = await db.execute({
      sql: 'SELECT symbol, type, shares, price, timestamp FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10',
      args: [userIdNum]
    });
    
    // Convert transaction price to user's currency for displaying history
    const transactions = transactionsResult.rows.map((tx: any) => {
      const assetCurrency = getAssetCurrency(tx.symbol);
      const priceUser = convertAmount(tx.price, assetCurrency, userCurrency, exchangeRate);
      return {
        ...tx,
        price: priceUser,
        priceNative: tx.price,
        currency: userCurrency
      };
    });

    // 6. Fetch active pending orders
    const pendingOrdersResult = await db.execute({
      sql: "SELECT id, symbol, type, order_type, shares, price, created_at FROM pending_orders WHERE user_id = ? AND status = 'PENDING' ORDER BY created_at DESC",
      args: [userIdNum]
    });
    
    const pendingOrders = await Promise.all(
      pendingOrdersResult.rows.map(async (po: any) => {
        const assetCurrency = getAssetCurrency(po.symbol);
        const targetPriceUser = convertAmount(po.price, assetCurrency, userCurrency, exchangeRate);
        
        let currentPriceNative = po.price; // Fallback
        try {
          if (po.symbol.includes('-OPT-')) {
            const parts = po.symbol.split('-OPT-');
            const underlyingSymbol = parts[0];
            const underlyingQuote = await yahooFinance.quote(underlyingSymbol);
            const liveQ = Array.isArray(underlyingQuote) ? underlyingQuote[0] : underlyingQuote;
            const underlyingPrice = liveQ?.regularMarketPrice;
            const underlyingPrevClose = liveQ?.regularMarketPreviousClose || underlyingPrice;
            
            if (underlyingPrice) {
              const optQuote = getSimulatedOptionQuoteFromUnderlying(po.symbol, underlyingPrice, underlyingPrevClose);
              currentPriceNative = optQuote?.regularMarketPrice || currentPriceNative;
            }
          } else {
            const quote = await yahooFinance.quote(po.symbol);
            const liveQ = Array.isArray(quote) ? quote[0] : quote;
            if (liveQ?.regularMarketPrice) {
              currentPriceNative = liveQ.regularMarketPrice;
            }
          }
        } catch (err: any) {
          console.warn(`[Portfolio API] Live price check failed for pending order ${po.symbol}:`, err?.message || err);
        }

        const currentPriceUser = convertAmount(currentPriceNative, assetCurrency, userCurrency, exchangeRate);

        return {
          ...po,
          price: targetPriceUser,
          priceNative: po.price,
          currentPrice: currentPriceUser,
          currentPriceNative,
          currency: userCurrency,
          assetCurrency
        };
      })
    );

    const portfolioValue = enhancedHoldings.reduce((sum, h) => sum + h.totalValue, 0);

    return NextResponse.json({
      balance: user.balance,
      portfolioValue,
      totalValue: user.balance + portfolioValue,
      currency: userCurrency,
      exchangeRate,
      holdings: enhancedHoldings,
      transactions,
      pendingOrders
    });

  } catch (error: any) {
    console.error('Portfolio fetch API error:', error);
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
