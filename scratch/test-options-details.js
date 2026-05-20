const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    console.log("Getting options for AAPL...");
    const options = await yahooFinance.options('AAPL');
    const optObj = options.options[0];
    console.log("Option keys:", Object.keys(optObj));
    console.log("Calls count:", optObj.calls.length);
    console.log("Puts count:", optObj.puts.length);
    console.log("Sample call object:", JSON.stringify(optObj.calls[0], null, 2));
    console.log("Sample put object:", JSON.stringify(optObj.puts[0], null, 2));
  } catch (err) {
    console.error("Error in test:", err);
  }
}

test();
