import YahooFinance from 'yahoo-finance2';

const yahooFinance = new (YahooFinance as any)();

// Fetch live USDINR rate or fallback
export async function getExchangeRate(): Promise<number> {
  try {
    const quote = await yahooFinance.quote('USDINR=X');
    return quote?.regularMarketPrice || 83.5;
  } catch (e) {
    return 83.5;
  }
}

export function getAssetCurrency(symbol: string): 'USD' | 'INR' {
  const cleanSymbol = symbol.split('-OPT-')[0];
  if (
    cleanSymbol.endsWith('.NS') || 
    cleanSymbol.endsWith('.BO') || 
    cleanSymbol === '^NSEI' || 
    cleanSymbol === '^NSEBANK' || 
    cleanSymbol === '^BSESN'
  ) {
    return 'INR';
  }
  return 'USD';
}

export function convertAmount(amount: number, from: 'USD' | 'INR', to: 'USD' | 'INR', rate: number): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'INR') return amount * rate;
  return amount / rate;
}

// Standard normal cumulative distribution function (approximation)
export function stdNormalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

// Standard normal probability density function
export function stdNormalPDF(x: number): number {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
}

export interface OptionGreeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

/**
 * Calculates option price and greeks using Black-Scholes model.
 * S: Current stock price
 * K: Strike price
 * T: Time to expiration in years (days / 365)
 * r: Risk-free interest rate (e.g. 0.07 for 7%)
 * sigma: Implied volatility (e.g. 0.25 for 25%)
 * type: 'CE' (Call) or 'PE' (Put)
 */
export function calculateBlackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'CE' | 'PE'
): OptionGreeks {
  if (S <= 0 || K <= 0) {
    return { price: 0, delta: 0, gamma: 0, theta: 0, vega: 0 };
  }
  if (T <= 0) {
    T = 0.0001; // Avoid divide by zero
  }

  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const n_d1 = stdNormalPDF(d1);
  const N_d1 = stdNormalCDF(d1);
  const N_d2 = stdNormalCDF(d2);

  let price = 0;
  let delta = 0;
  let theta = 0;

  if (type === 'CE') {
    price = S * N_d1 - K * Math.exp(-r * T) * N_d2;
    delta = N_d1;
    // Theta in years, divided by 365 for daily decay
    theta = (-S * n_d1 * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * N_d2;
  } else {
    price = K * Math.exp(-r * T) * stdNormalCDF(-d2) - S * stdNormalCDF(-d1);
    delta = N_d1 - 1;
    theta = (-S * n_d1 * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * stdNormalCDF(-d2);
  }

  const gamma = n_d1 / (S * sigma * Math.sqrt(T));
  // Vega for 1% change in volatility
  const vega = (S * Math.sqrt(T) * n_d1) / 100;
  const thetaDaily = theta / 365;

  // Floor the option price to a minimum tick size (e.g. 0.05 for Indian markets)
  return {
    price: Math.max(0.05, price),
    delta,
    gamma,
    theta: thetaDaily,
    vega
  };
}

export function getExpiryDates(): { date: Date; label: string; dateStr: string }[] {
  const dates: { date: Date; label: string; dateStr: string }[] = [];
  const today = new Date();
  
  // Find the next 3 Thursdays
  let current = new Date(today);
  while (dates.length < 3) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() === 4) { // Thursday
      const d = new Date(current);
      d.setHours(15, 30, 0, 0);
      const dateStr = d.toISOString().split('T')[0];
      dates.push({
        date: d,
        label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        dateStr
      });
    }
  }

  // Find last Thursday of current month
  const lastThursdayOfMonth = (year: number, month: number) => {
    const d = new Date(year, month + 1, 0); // Last day of month
    while (d.getDay() !== 4) {
      d.setDate(d.getDate() - 1);
    }
    d.setHours(15, 30, 0, 0);
    return d;
  };

  const lastThursThisMonth = lastThursdayOfMonth(today.getFullYear(), today.getMonth());
  const lastThursThisMonthStr = lastThursThisMonth.toISOString().split('T')[0];
  if (lastThursThisMonth > today && !dates.some(item => item.dateStr === lastThursThisMonthStr)) {
    dates.push({
      date: lastThursThisMonth,
      label: lastThursThisMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + " (Monthly)",
      dateStr: lastThursThisMonthStr
    });
  }

  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const lastThursNextMonth = lastThursdayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth());
  const lastThursNextMonthStr = lastThursNextMonth.toISOString().split('T')[0];
  dates.push({
    date: lastThursNextMonth,
    label: lastThursNextMonth.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + " (Next Month)",
    dateStr: lastThursNextMonthStr
  });

  return dates;
}

export function getStrikeStep(symbol: string, price: number): number {
  if (symbol.includes('NSEI')) return 50; // Nifty 50
  if (symbol.includes('NSEBANK')) return 100; // Bank Nifty
  if (price > 2000) return 50;
  if (price > 1000) return 20;
  if (price > 500) return 10;
  if (price > 100) return 5;
  return 1.0;
}

export function getVolatility(symbol: string): number {
  if (symbol.includes('NSEI') || symbol.includes('NSEBANK') || symbol === 'SPY' || symbol === 'QQQ') return 0.16; // lower vol for indices
  return 0.28; // higher vol for equities
}

export function getRiskFreeRate(symbol: string): number {
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO') || symbol === '^NSEI' || symbol === '^NSEBANK') {
    return 0.07; // 7% in India
  }
  return 0.045; // 4.5% in US
}

export interface OptionChainItem {
  strike: number;
  call: OptionGreeks & { symbol: string; change: number; percentChange: number; openInterest: number; bidOpenInterest: number };
  put: OptionGreeks & { symbol: string; change: number; percentChange: number; openInterest: number; bidOpenInterest: number };
}

export function generateSimulatedOptionChain(
  symbol: string,
  underlyingPrice: number,
  expiryDateStr?: string
): { expirationDates: string[]; strikes: number[]; chain: OptionChainItem[] } {
  const expiries = getExpiryDates();
  const selectedExpiry = expiryDateStr 
    ? expiries.find(e => e.dateStr === expiryDateStr) || expiries[0]
    : expiries[0];

  const today = new Date();
  const diffMs = selectedExpiry.date.getTime() - today.getTime();
  const T = Math.max(0.0001, diffMs / (1000 * 60 * 60 * 24 * 365));

  const r = getRiskFreeRate(symbol);
  const sigma = getVolatility(symbol);

  const strikeStep = getStrikeStep(symbol, underlyingPrice);
  const atmStrike = Math.round(underlyingPrice / strikeStep) * strikeStep;

  // Generate 8 strikes below and 8 strikes above ATM (17 total strikes)
  const strikes: number[] = [];
  for (let i = -8; i <= 8; i++) {
    strikes.push(atmStrike + i * strikeStep);
  }

  const chain: OptionChainItem[] = strikes.map(strike => {
    const callGreeks = calculateBlackScholes(underlyingPrice, strike, T, r, sigma, 'CE');
    const putGreeks = calculateBlackScholes(underlyingPrice, strike, T, r, sigma, 'PE');

    // Create symbols in format: RELIANCE.NS-OPT-20260528-1360-CE
    const cleanExpiry = selectedExpiry.dateStr.replace(/-/g, '');
    const callSymbol = `${symbol}-OPT-${cleanExpiry}-${strike}-CE`;
    const putSymbol = `${symbol}-OPT-${cleanExpiry}-${strike}-PE`;

    // Simulated open interest based on distance from ATM (higher close to ATM)
    const distFactor = Math.exp(-Math.pow((underlyingPrice - strike) / (underlyingPrice * 0.05), 2));
    const openInterest = Math.round(distFactor * 50000);
    const bidOpenInterest = Math.round(distFactor * 45000);

    return {
      strike,
      call: {
        ...callGreeks,
        symbol: callSymbol,
        change: callGreeks.price * 0.02 * (Math.random() - 0.4), // random small change
        percentChange: (Math.random() - 0.4) * 5,
        openInterest,
        bidOpenInterest
      },
      put: {
        ...putGreeks,
        symbol: putSymbol,
        change: putGreeks.price * 0.02 * (Math.random() - 0.6),
        percentChange: (Math.random() - 0.6) * 5,
        openInterest: Math.round(openInterest * 0.9),
        bidOpenInterest: Math.round(bidOpenInterest * 0.9)
      }
    };
  });

  return {
    expirationDates: expiries.map(e => e.dateStr),
    strikes,
    chain
  };
}

export function parseSimulatedOptionSymbol(symbol: string) {
  // Pattern: RELIANCE.NS-OPT-20260528-1360-CE or ^NSEI-OPT-20260528-22000-PE
  const parts = symbol.split('-OPT-');
  if (parts.length !== 2) return null;

  const underlying = parts[0];
  const details = parts[1].split('-');
  if (details.length !== 3) return null;

  const expiryStr = details[0]; // YYYYMMDD
  const strike = parseFloat(details[1]);
  const type = details[2] as 'CE' | 'PE';

  // Parse YYYYMMDD into Date
  const year = parseInt(expiryStr.substring(0, 4));
  const month = parseInt(expiryStr.substring(4, 6)) - 1;
  const day = parseInt(expiryStr.substring(6, 8));
  const expiryDate = new Date(year, month, day, 15, 30, 0, 0);

  return {
    underlying,
    expiryDate,
    expiryStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    strike,
    type
  };
}

export function getSimulatedOptionQuoteFromUnderlying(
  symbol: string,
  underlyingPrice: number,
  underlyingPrevClose: number
) {
  const parsed = parseSimulatedOptionSymbol(symbol);
  if (!parsed) return null;

  const today = new Date();
  const diffMs = parsed.expiryDate.getTime() - today.getTime();
  const T = Math.max(0.0001, diffMs / (1000 * 60 * 60 * 24 * 365));

  const r = getRiskFreeRate(parsed.underlying);
  const sigma = getVolatility(parsed.underlying);

  const currentGreeks = calculateBlackScholes(underlyingPrice, parsed.strike, T, r, sigma, parsed.type);
  const prevGreeks = calculateBlackScholes(underlyingPrevClose, parsed.strike, T, r, sigma, parsed.type);

  const price = currentGreeks.price;
  const change = price - prevGreeks.price;
  const percentChange = prevGreeks.price > 0 ? (change / prevGreeks.price) * 100 : 0;

  return {
    symbol,
    shortName: `${parsed.underlying} ${parsed.expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${parsed.strike} ${parsed.type === 'CE' ? 'Call' : 'Put'}`,
    longName: `${parsed.underlying} Option Contract - Strike ${parsed.strike} ${parsed.type}`,
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: percentChange,
    currency: parsed.underlying.endsWith('.NS') || parsed.underlying.endsWith('.BO') || parsed.underlying === '^NSEI' || parsed.underlying === '^NSEBANK' ? 'INR' : 'USD',
    quoteType: 'OPTION',
    strike: parsed.strike,
    optionsType: parsed.type === 'CE' ? 'Call' : 'Put',
    greeks: currentGreeks,
    marketState: 'REGULAR'
  };
}
