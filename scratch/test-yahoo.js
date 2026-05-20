const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    console.log("Searching for RELIANCE...");
    const searchRes = await yahooFinance.search('RELIANCE');
    console.log("Search Results:", JSON.stringify(searchRes.quotes.slice(0, 3), null, 2));

    console.log("\nGetting quote for RELIANCE.NS...");
    const quote = await yahooFinance.quote('RELIANCE.NS');
    console.log("Quote:", {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      currency: quote.currency,
      marketState: quote.marketState,
      exchange: quote.fullExchangeName
    });

    console.log("\nGetting options for AAPL...");
    const options = await yahooFinance.options('AAPL');
    if (options && options.optionChain && options.optionChain.result) {
      const result = options.optionChain.result[0];
      console.log("Expiration dates available:", result.expirationDates);
      console.log("Strikes available:", result.strikes.slice(0, 5));
      const calls = result.options[0].calls;
      const puts = result.options[0].puts;
      console.log(`Found ${calls.length} calls and ${puts.length} puts.`);
      console.log("Sample call option:", JSON.stringify(calls[0], null, 2));
    } else {
      console.log("No options data found for AAPL.");
    }
  } catch (err) {
    console.error("Error in test:", err);
  }
}

test();
