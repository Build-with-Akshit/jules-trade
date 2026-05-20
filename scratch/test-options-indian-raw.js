const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    console.log("Getting options for RELIANCE.NS...");
    const options = await yahooFinance.options('RELIANCE.NS');
    console.log("Options Result:", JSON.stringify(options, null, 2));
  } catch (err) {
    console.error("Error in test:", err.message || err);
  }
}

test();
