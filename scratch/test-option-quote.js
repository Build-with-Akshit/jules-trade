const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    // Get options for AAPL to find a valid contract symbol
    const options = await yahooFinance.options('AAPL');
    const firstCall = options.options[0].calls[0];
    const contractSymbol = firstCall.contractSymbol;
    console.log("Found contract symbol:", contractSymbol);

    console.log("Fetching quote for contract symbol...");
    const quote = await yahooFinance.quote(contractSymbol);
    console.log("Contract Quote:", JSON.stringify(quote, null, 2));
  } catch (err) {
    console.error("Error in test:", err.message || err);
  }
}

test();
