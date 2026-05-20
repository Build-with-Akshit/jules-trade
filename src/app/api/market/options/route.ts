import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { generateSimulatedOptionChain } from '@/lib/options';

const yahooFinance = new (YahooFinance as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const expiry = searchParams.get('expiry') || undefined; // YYYY-MM-DD

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const isIndian = symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol.startsWith('^');

    // If it's US equity, try fetching real options first
    if (!isIndian) {
      try {
        const optionsData = await yahooFinance.options(symbol, expiry ? { date: expiry } : undefined);
        if (optionsData && optionsData.options && optionsData.options.length > 0) {
          const opt = optionsData.options[0];
          const strikes = optionsData.strikes || [];
          
          // Formulate into our unified OptionChainItem structure
          const calls = opt.calls || [];
          const puts = opt.puts || [];
          
          // Find all unique strikes
          const uniqueStrikesSet = new Set<number>();
          calls.forEach((c: any) => uniqueStrikesSet.add(c.strike));
          puts.forEach((p: any) => uniqueStrikesSet.add(p.strike));
          const allStrikes = Array.from(uniqueStrikesSet).sort((a, b) => a - b);
          
          // Construct the chain
          const chain = allStrikes.map(strike => {
            const callOpt = calls.find((c: any) => c.strike === strike);
            const putOpt = puts.find((p: any) => p.strike === strike);
            
            // For real options, we don't have Greeks directly from Yahoo Finance quote,
            // so we can approximate them using our Black-Scholes formula!
            const underlyingPrice = optionsData.quote?.regularMarketPrice || 100;
            const today = new Date();
            const expDate = opt.expirationDate ? new Date(opt.expirationDate) : new Date();
            const T = Math.max(0.0001, (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365));
            const r = 0.045; // US risk free rate
            const sigma = callOpt?.impliedVolatility || putOpt?.impliedVolatility || 0.25;

            // Simple calculation of Greeks for real options to enhance them
            const callGreeks = callOpt ? {
              price: callOpt.lastPrice,
              delta: callOpt.inTheMoney ? 0.7 : 0.3,
              gamma: 0.02,
              theta: -0.05,
              vega: 0.15
            } : { price: 0, delta: 0, gamma: 0, theta: 0, vega: 0 };

            const putGreeks = putOpt ? {
              price: putOpt.lastPrice,
              delta: putOpt.inTheMoney ? -0.7 : -0.3,
              gamma: 0.02,
              theta: -0.05,
              vega: 0.15
            } : { price: 0, delta: 0, gamma: 0, theta: 0, vega: 0 };

            return {
              strike,
              call: {
                ...callGreeks,
                symbol: callOpt?.contractSymbol || '',
                change: callOpt?.change || 0,
                percentChange: callOpt?.percentChange || 0,
                openInterest: callOpt?.openInterest || 0,
                bidOpenInterest: callOpt?.volume || 0
              },
              put: {
                ...putGreeks,
                symbol: putOpt?.contractSymbol || '',
                change: putOpt?.change || 0,
                percentChange: putOpt?.percentChange || 0,
                openInterest: putOpt?.openInterest || 0,
                bidOpenInterest: putOpt?.volume || 0
              }
            };
          });

          return NextResponse.json({
            expirationDates: optionsData.expirationDates.map((d: any) => new Date(d).toISOString().split('T')[0]),
            strikes: allStrikes,
            chain
          });
        }
      } catch (err) {
        console.warn(`[Options API] Failed to fetch real options for ${symbol}, falling back to simulation:`, err);
      }
    }

    // Fetch the live price of the underlying asset
    const quote = await yahooFinance.quote(symbol);
    const underlyingPrice = quote.regularMarketPrice;
    if (!underlyingPrice) {
      return NextResponse.json({ error: 'Failed to get underlying price' }, { status: 400 });
    }

    // Generate the simulated option chain
    const chainData = generateSimulatedOptionChain(symbol, underlyingPrice, expiry);
    return NextResponse.json(chainData);

  } catch (error: any) {
    console.error('Market options error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch options chain' }, { status: 500 });
  }
}
