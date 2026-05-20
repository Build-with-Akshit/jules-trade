const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    console.log("Getting options for AAPL...");
    const options = await yahooFinance.options('AAPL');
    console.log("Options Keys:", Object.keys(options));
    console.log("Options Result:", JSON.stringify(options, null, 2).slice(0, 1000));
  } catch (err) {
    console.error("Error in test:", err);
  }
}

test();
